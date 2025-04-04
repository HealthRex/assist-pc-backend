import { Injectable, Logger } from '@nestjs/common';
import { generateText, LanguageModelV1 } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { ReferralRequest } from './models/referralRequest';
import * as fs from 'node:fs';
import { join } from 'path';
import { ReferralResponse } from './models/referralResponse';
import { TemplateSelectorService } from './template-selector/template-selector.service';
import { PathwayService } from './pathway/pathway.service';
import { SpecialistAIResponse } from './models/specialistAIResponse';
import { Observable } from 'rxjs';

enum AIProvider {
  Claude = 'CLAUDE',
  Gemini = 'GEMINI',
  // TODO add further models
}

const systemPromptFilePath: string = './resources/prompt.txt';
const systemPromptWithoutTemplatesFilePath: string =
  './resources/prompt_no_matched_templates.txt';

// const referralTemplateFileMimeType: string = 'application/pdf';
// const referralTemplateFilePath: string =
//   './resources/Endocrinology eConsult Checklists FINAL 4.19.22.docx.pdf';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly templateSelectorService: TemplateSelectorService,
    private readonly pathwayService: PathwayService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async postReferralQuestion(
    request: ReferralRequest,
  ): Promise<ReferralResponse> {
    this.logger.debug('request: ', request);

    const response = await this.queryLLM(request);
    await this.replaceSpecialistResponseWithPathwayResponse(request, response);

    this.logger.debug(response);

    return response;
  }

  postReferralQuestionStreamed(
    request: ReferralRequest,
  ): Observable<{ data: ReferralResponse }> {
    return new Observable((subscriber) => {
      this.logger.debug('request: ', request);

      this.queryLLM(request)
        .then((response) => {
          subscriber.next({ data: response });

          this.replaceSpecialistResponseWithPathwayResponse(request, response)
            .then(() => {
              subscriber.next({ data: response });

              this.logger.debug('response: ', response);
              subscriber.complete();
            })
            .catch((reason) => {
              subscriber.error(reason);
            });
        })
        .catch((reason) => {
          subscriber.error(reason);
        });
    });
  }

  private async queryLLM(request: ReferralRequest) {
    const systemPrompt = await this.selectSystemPrompt(request);

    // const referralTemplatesBase64: string = Buffer.from(
    //   fs.readFileSync(referralTemplateFilePath).toString(),
    // ).toString('base64');

    const input = {
      model: this.selectModel(),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Clinical question: ' + request.question,
            },
            {
              type: 'text',
              text: 'Patient notes: ' + request.clinicalNotes,
            },
            // {
            //   type: 'file',
            //   data: referralTemplatesBase64,
            //   mimeType: referralTemplateFileMimeType,
            // },
          ],
        },
      ],
    };

    // this.logger.debug('referralTemplatesBase64: ', referralTemplatesBase64);
    this.logger.debug('input: ', input);

    // @ts-expect-error('input type is not recognized even though it matches to required type')
    const { text } = await generateText(input);
    this.logger.debug(text);

    const supposedJsonResponse: string = text
      .substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
      .replaceAll(/\n/g, '');
    this.logger.debug('supposedJsonResponse:', supposedJsonResponse);

    return JSON.parse(supposedJsonResponse) as ReferralResponse;
  }

  private async replaceSpecialistResponseWithPathwayResponse(
    request: ReferralRequest,
    response: ReferralResponse,
  ) {
    const pathwayResponse: SpecialistAIResponse =
      await this.pathwayService.retrieveAnswer(
        request.question,
        request.clinicalNotes,
        response.populatedTemplate,
      );

    if (pathwayResponse) {
      response.specialistAIResponse = pathwayResponse;
    }
  }

  private async selectSystemPrompt(request: ReferralRequest) {
    const bestTemplate = await this.templateSelectorService.selectBestTemplate(
      request.question,
    );
    this.logger.debug('bestTemplate', bestTemplate);

    if (bestTemplate) {
      return fs
        .readFileSync(join(process.cwd(), systemPromptFilePath))
        .toString()
        .replace('{{TemplateGoogleDocLink}}', bestTemplate);
    } else {
      // no template selected
      return fs
        .readFileSync(join(process.cwd(), systemPromptWithoutTemplatesFilePath))
        .toString();
    }
  }

  private selectModel(): LanguageModelV1 {
    switch (String(process.env.AI_PROVIDER).toUpperCase() as AIProvider) {
      case AIProvider.Claude:
        return anthropic('claude-3-opus-20240229');
      case AIProvider.Gemini:
        return google('models/gemini-2.0-flash');
      default:
        throw new Error('unknown AI_PROVIDER type selected');
    }
  }
}
