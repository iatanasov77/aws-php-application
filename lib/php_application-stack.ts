import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
    CfnKeyPair,
    IInstance,
    InstanceType,
    InstanceClass,
    InstanceSize,
    AmazonLinuxImage,
    AmazonLinuxGeneration
} from 'aws-cdk-lib/aws-ec2';

import {
    db,
    storage,
    machine,
    application,
    BaseFunction,
    MachineKeyPair,
    ILoadbalancedWebServer
} from 'aws-cdk-helpers';

export class PhpApplicationStack extends cdk.Stack
{
    cfnKeyPair: CfnKeyPair;
    
    webServer?: IInstance;
    
    lbws?: ILoadbalancedWebServer;
    
    constructor( scope: Construct, id: string, props?: cdk.StackProps )
    {
        super( scope, id, props );
        
        const loadbalanced = scope.node.tryGetContext( 'loadbalanced' );
        
        // Create Key Pair
        const keyPair: MachineKeyPair = machine.createKeyPair( this, { namePrefix: 'My' } );
        this.cfnKeyPair = keyPair.cfnKeyPair;
            
        if ( ( /true/i ).test( loadbalanced ) ) {
        
            // Create Loadbalanced Web Server EC2 instances
            this.lbws = machine.createLoadbalancedWebServerInstance( this, {
                namePrefix: 'My',
                
                instanceType: InstanceType.of( InstanceClass.T2, InstanceSize.MICRO ),
                machineImage: new AmazonLinuxImage({
                    generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
                }),
                
                keyPair: keyPair.keyPair,
                cidr: '10.0.0.0/21',
                
                initElements: application.initSamplePhpApplication( this, {
                    sourcePath: './src/web',
                    applicationRoot: '/usr/share/nginx/html',
                    files: [
                        'info.php',
                        'index.php'
                    ],
                    useComposer: true,
                    withEnv: true,
                    userName: 'iatanasov',
                }),
                
                desiredCapacity: 3,
                autoScalingParams: {
                    cpuUtilizationPercent: 60,
                    рequestsCountPerMinute: 60,
                }
            });
        
            // Create Outputs
            this.createLoadbalancedWebServerOutputs();
            
        } else {
            // Create Web Server EC2 instance
            this.webServer = machine.createStandaloneWebServerInstance( this, {
                namePrefix: 'My',
                
                instanceType: InstanceType.of( InstanceClass.T2, InstanceSize.MICRO ),
                machineImage: new AmazonLinuxImage({
                    generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
                }),
                
                keyPair: keyPair.keyPair,
                cidr: '10.0.0.0/21',
                
                initScriptPath: './src/ec2Init/vankosoft.awslinux-2023.sh',
                withInstanceInit: false,
                lamp: {
                    phpVersion: '8.2',
                    databasePassword: 'PassWord4-root',
                },
                initElements: application.initSamplePhpApplication( this, {
                    sourcePath: './src/web',
                    
                    applicationRoot: '/var/www/html',
                    //applicationRoot: '/usr/share/nginx/html',
                    
                    files: [
                        'info.php',
                        'index.php'
                    ],
                    useComposer: true,
                    withEnv: true,
                    userName: 'iatanasov',
                })
            });
            
            // Create Outputs
            this.createStandaloneWebServerOutputs();
        }
    }
    
    private createOutputs()
    {
        // Download Private Key from KeyPair assigned to the EC2 instance
        new cdk.CfnOutput( this, 'DownloadKeyCommand', {
            value: `
aws ssm get-parameter --name /ec2/keypair/${this.cfnKeyPair.attrKeyPairId} \\
--with-decryption --query Parameter.Value \\
--output text --profile default > ~/cdk-key.pem && chmod 0600 ~/cdk-key.pem
`
        });
    }
    
    private createStandaloneWebServerOutputs()
    {
        this.createOutputs();
        
        if ( this.webServer ) {
            // Instance ID of the EC2 instance of the Web Server
            new cdk.CfnOutput( this, "InstanceId", {
                value: this.webServer.instanceId
            });
            
            // Connect to the Web Server with SSH
            new cdk.CfnOutput( this, 'ssh command', {
                value: `ssh -i ~/cdk-key.pem -o IdentitiesOnly=yes ec2-user@${this.webServer.instancePublicDnsName}`
            });
            
            // Web Interface Url
            new cdk.CfnOutput( this, "WebInterfaceUrl", {
                value: `http://${this.webServer.instancePublicIp}/`,
                description: 'Simple web interface to upload Files'
            });
        }
    }
    
    private createLoadbalancedWebServerOutputs()
    {
        this.createOutputs();
        
        if ( this.lbws ) {
            // Bash Command to List Public DNS Addresses of Available EC2 Instances
            new cdk.CfnOutput( this, 'ListInstancesPublicDNS', {
                value: `
aws autoscaling describe-auto-scaling-instances --region eu-central-1 --profile default --output text \\
--query "AutoScalingInstances[?AutoScalingGroupName=='${this.lbws.autoScalingGroup.autoScalingGroupName}'].InstanceId" \\
| xargs -n1 aws ec2 describe-instances --instance-ids $ID --region eu-central-1 --profile default \\
--query "Reservations[].Instances[].PublicDnsName" --output text
            `
            });
        
            // SSH Command to Connect to EC2 Instances
            new cdk.CfnOutput( this, 'ConnectInstanceWithSsh', {
                value: `ssh -i ~/cdk-key.pem -o IdentitiesOnly=yes ec2-user@<Instance Public Dns>`
            });
            
            // Output the WebInterface Url
            new cdk.CfnOutput( this, "WebInterfaceUrl", {
                value: `http://${this.lbws.loadBalancer.loadBalancerDnsName}`
            });
        }
    }
}
