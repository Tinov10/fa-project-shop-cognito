import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch';

interface ICloudWatchEvent {
  sub: string;
  err: Error;
  cloudWatchClient: CloudWatchClient;
}

export const handleCloudwatchEvent = async (values: ICloudWatchEvent) => {
  //input
  const input: PutMetricDataCommandInput = {
    MetricData: [
      {
        MetricName: 'FailedPostConformationMetrics',
        Unit: 'Count',
        Value: 1,
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: 'FailedPostConformationMetrics',
            Value: values.err.message,
          },
        ],
      },
    ],
    Namespace: 'PrintHelix',
  };

  // command
  const command: PutMetricDataCommand = new PutMetricDataCommand(input);
  try {
    // no result back
    await values.cloudWatchClient.send(command);
  } catch (eventError) {
    console.error(`Error while sending error event for user: ${values.sub}`);
    console.error(eventError);
  }
};
