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
    ILoadbalancedWebServer,
    LaunchTemplateRole
} from 'aws-cdk-helpers';

require( 'dotenv-flow' ).config();

export class PhpApplicationStack extends cdk.Stack
{
    namePrefix: string;
    
    mKeyPair: MachineKeyPair;
    
    webServer?: IInstance;
    
    lbws?: ILoadbalancedWebServer;
    
    constructor( scope: Construct, id: string, props?: cdk.StackProps )
    {
        super( scope, id, props );
        
        const loadbalanced = scope.node.tryGetContext( 'loadbalanced' );
        this.namePrefix = 'TestPhpApplication_';
         
        // Create Key Pair
        this.mKeyPair = machine.createKeyPair( this, { namePrefix: this.namePrefix } );
            
        if ( ( /true/i ).test( loadbalanced ) ) {
            // Create Loadbalanced Web Server EC2 instances
            this.createLoadbalancedWebServer();
        } else {
            // Create Web Server EC2 instance
            this.createStandalonedWebServer();
        }
    }
    
    private createLoadbalancedWebServer(): void
    {
        this.lbws = machine.createLoadbalancedWebServerInstance( this, {
            namePrefix: this.namePrefix,
            
            instanceType: InstanceType.of( InstanceClass.T2, InstanceSize.MICRO ),
            machineImage: new AmazonLinuxImage({
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
            }),
            keyPair: this.mKeyPair.keyPair,
            
            cidr: '10.0.0.0/21',
            inboundPorts: [
                {port: 22, description: 'SSH'},
                {port: 80, description: 'HTTP'}
            ],
            
            launchTemplateRole: LaunchTemplateRole.Ec2ManagedInstanceCoreRole,
            //launchTemplateRole: LaunchTemplateRole.AdministratorAccessRole,
            
            initScripts: [
                { path: './src/ec2Init/webserver.sh', params: {__PHP_VERSION__: '8.2'} },
                { path: './src/ec2Init/mysql.sh', params: {__DATABASE_ROOT_PASSWORD__: 'aws'} },
                { path: './src/ec2Init/phpmyadmin.sh', params: {__PHPMYADMIN_BASE_PATH__: '/var/www/html'} },
            ],
            
            initElements: application.initSamplePhpApplication( this, {
                sourcePath: './src/web',
                //applicationRoot: '/usr/share/nginx/html',
                applicationRoot: '/var/www/html',
                
                files: [
                    'info.php',
                    'index.php'
                ],
                useComposer: true,
                withEnv: true,
//                     userName: 'iatanasov',
            }),
            
            desiredCapacity: 3,
            autoScalingParams: {
                cpuUtilizationPercent: 60,
                рequestsCountPerMinute: 60,
            }
        });
    
        // Create Outputs
        this.createLoadbalancedWebServerOutputs();
    }
    
    private createStandalonedWebServer(): void
    {
        this.webServer = machine.createStandaloneWebServerInstance( this, {
            namePrefix: this.namePrefix,
            
            instanceType: InstanceType.of( InstanceClass.T2, InstanceSize.MICRO ),
            machineImage: new AmazonLinuxImage({
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
            }),
            keyPair: this.mKeyPair.keyPair,
            
            cidr: '10.0.0.0/21',
            inboundPorts: [
                {port: 22, description: 'SSH'},
                {port: 80, description: 'HTTP'},
                {port: '20-21', description: 'FTP'},
                {port: '1024-1048', description: 'FTP'}
            ],
            
            initScripts: [
                { path: './src/ec2Init/webserver.sh', params: {__PHP_VERSION__: process.env.PHP_VERSION as string} },
                { path: './src/ec2Init/mysql.sh', params: {__DATABASE_ROOT_PASSWORD__: process.env.DATABASE_ROOT_PASSWORD as string} },
                { path: './src/ec2Init/phpmyadmin.sh', params: {__PHPMYADMIN_BASE_PATH__: process.env.PHPMYADMIN_BASE_PATH as string} },
                { path: './src/ec2Init/ftp.sh', params: {
                    __PASV_MIN_PORT__: '1024',
                    __PASV_MAX_PORT__: '1048',
                    __FTP_USER__: process.env.FTP_USER as string,
                    __FTP_PASSWORD__: process.env.FTP_PASSWORD as string
                }},   
            ],
            
            initElements: application.initSamplePhpApplication( this, {
                sourcePath: './src/web',
                //applicationRoot: '/usr/share/nginx/html',
                applicationRoot: process.env.APPLICATION_ROOT_PATH as string,
                
                files: [
                    'info.php',
                    'index.php'
                ],
                useComposer: true,
                withEnv: true,
                //userName: 'iatanasov',
            })
        });
        
        // Create Outputs
        this.createStandaloneWebServerOutputs();
    }
    
    private createOutputs()
    {
        // Download Private Key from KeyPair assigned to the EC2 instance
        new cdk.CfnOutput( this, 'DownloadKeyCommand', {
            value: `
aws ssm get-parameter --name /ec2/keypair/${this.mKeyPair.cfnKeyPair.attrKeyPairId} \\
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
