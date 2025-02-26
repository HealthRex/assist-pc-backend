import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { JSONSchema } from 'json-schema-to-ts';

// export const referralResponseSchema = z.object({
//   specialistSummary: z.string(),
//   templateSelectionProcess: z.string(),
//   populatedTemplate: z.array(z.record(z.string(), z.string())),
//   specialistAIResponse: z.object({
//     summaryResponse: z.string(),
//     suggestedLabOrders: z.array(z.string()),
//     suggestedImaging: z.array(z.string()),
//     suggestedMedications: z.array(z.string()),
//   }),
// });
export const referralResponseSchema = {
  type: 'object',
  properties: {
    specialistSummary: { type: 'string' },
    templateSelectionProcess: { type: 'string' },
    populatedTemplate: {
      type: 'string',
      // type: 'array',
      // items: {
      //   type: 'object',
      //   additionalProperties: { type: 'string' },
      // },
    },
    specialistAIResponse: {
      type: 'object',
      properties: {
        summaryResponse: { type: 'string' },
        suggestedLabOrders: {
          type: 'array',
          items: { type: 'string' },
        },
        suggestedImaging: {
          type: 'array',
          items: { type: 'string' },
        },
        suggestedMedications: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

export class PopulatedTemplate {
  @ApiProperty({
    description: 'Template selection process explanation',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  templateSelectionProcess: string;

  @ApiProperty({
    description: 'Filled referral template',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  filledReferralTemplate: string;
}

// {
//   "1_specialistSummary": string,
//   "2_populatedTemplate": {
//     "a_templateSelectionProcess": string,
//     "b_strictTemplateAdherence": string,
//    },
//   "3_specialistAIResponse": string
// }
export class ReferralResponse {
  @ApiProperty({
    description: 'Specialist summary response',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistSummary: string;

  @ApiProperty({
    description: 'Populated template',
  })
  @Type(() => PopulatedTemplate)
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  populatedTemplate: PopulatedTemplate;

  @ApiProperty({
    description: 'Specialist AI response',
  })
  @Transform(({ key }) => key.substring(2), { toClassOnly: true })
  specialistAIResponse: string;
}
