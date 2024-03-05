import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import ec2 = require('aws-cdk-lib/aws-ec2');
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class MyEcsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

   // Create an ECR repository
   const repository = new ecr.Repository(this, 'MyECRRepository', {
    repositoryName: 'my-ecr-repository'
  });

  const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });


  const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
  cluster.addCapacity('DefaultAutoScalingGroup', {
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO)
  });

// Create Task Definition
  const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');
  const container = taskDefinition.addContainer('web', {
    image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
    memoryLimitMiB: 256,
  });

  container.addPortMappings({
    containerPort: 80,
    hostPort: 8080,
    protocol: ecs.Protocol.TCP
  });

  // Create Service
  const service = new ecs.Ec2Service(this, "Service", {
    cluster,
    taskDefinition,
  });

  // Create ALB
  const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
    vpc,
    internetFacing: true
  });

  const listener = lb.addListener('PublicListener', { port: 80, open: true });

  // Attach ALB to ECS Service
  listener.addTargets('ECS', {
    port: 8080,
    targets: [service.loadBalancerTarget({
      containerName: 'web',
      containerPort: 80
    })],
  
    // include health check (default is none)
  healthCheck: {
      interval: cdk.Duration.seconds(60),
      path: "/health",
      timeout: cdk.Duration.seconds(5),
  }
});

  // Output the DNS name of the load balancer
  new cdk.CfnOutput(this, 'repository name', {
    value: repository.repositoryName
  })

  }
  

}
