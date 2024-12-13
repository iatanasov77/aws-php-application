# aws-php-application
AWS CDK Application to Deploy PHP/Symfony Applications to AWS

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


## Create a Loadbalanced Web Server Instances
`
cdk synth -c loadbalanced=true
cdk deploy -c loadbalanced=true --profile default
`

## Create a Standalone Web Server Instance
`
cdk synth
cdk deploy --profile default
`