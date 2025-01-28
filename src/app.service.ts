import { Injectable } from '@nestjs/common';
import { ReferralRequest } from '../models/referralRequest';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(request: ReferralRequest): Promise<any> {
    console.log('request: ', request);

    const params: Anthropic.MessageCreateParams = {
      max_tokens: 1024,
      messages: [{ role: 'user', content: request.question }],
      model: 'claude-3-5-sonnet-latest',
    };
    const result: Anthropic.Message = await client.messages.create(params);

    console.log(result.content);
    return result.content;
  }
}
