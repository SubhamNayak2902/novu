import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { SESConfig } from './ses.config';
import nodemailer from 'nodemailer';

export class SESEmailProvider implements IEmailProvider {
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly ses: SESClient;

  constructor(private readonly config: SESConfig) {
    this.ses = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const transporter = nodemailer.createTransport({
      SES: { ses: this.ses, aws: { SendRawEmailCommand } },
    });

    const info = await transporter.sendMail({
      from: from || this.config.from,
      to: to,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file,
        contentType: attachment.mime,
      })),
    });

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    let success: boolean;
    let message: string;
    let code: CheckIntegrationResponseEnum;
    const transporter = nodemailer.createTransport({
      SES: { ses: this.ses, aws: { SendRawEmailCommand } },
    });

    const testResponse = await transporter.sendMail({
      html: '',
      text: 'This is an Email to test the integration of your Amazon SES',
      to: this.config.from,
      from: this.config.from,
      subject: 'Test Amazon SES integration',
    });

    if (testResponse.err === null) {
      success = true;
      message = 'Integration test was succesful';
      code = CheckIntegrationResponseEnum.SUCCESS;
    } else {
      success = false;
      message = 'Integration test failed';
      code = CheckIntegrationResponseEnum.FAILED;
    }

    return {
      success: success,
      message: message,
      code: code,
    };
  }
}
