import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseModel {
  @ApiProperty({ example: 'Webhook processed successfully' })
  message!: string;
}
