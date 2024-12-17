# aws-php-application
AWS CDK Application to Deploy PHP/Symfony Applications to AWS

## Create a Loadbalanced Web Server Instances
```
cdk synth -c loadbalanced=true
cdk deploy -c loadbalanced=true --profile default
```

## Create a Standalone Web Server Instance
```
cdk synth
cdk deploy --profile default
```