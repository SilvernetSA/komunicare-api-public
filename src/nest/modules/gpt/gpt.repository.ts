import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

interface OpenAIChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Injectable()
export class GptRepository {
  private readonly apiKey: string =
    process.env.OPEN_AI_API_KEY || '';

  private readonly endpoint = 'https://komunicare-apps.openai.azure.com';

  private readonly deploymentName = 'komunicare';

  private buildGenderHint(gender?: string): string {
    if (gender === 'male') return 'The speaker is male. ';
    if (gender === 'female') return 'The speaker is female. ';
    return '';
  }

  async improvePhrase(
    payload: { phrase: string; language: string; gender?: string },
  ): Promise<string | undefined> {
    const genderHint = this.buildGenderHint(payload.gender);
    const response: AxiosResponse<OpenAIChatCompletionResponse> = await axios.post(
      `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2023-05-15`,
      {
        messages: [
          {
            role: 'system',
            content: `Answer only in ${payload.language}.`,
          },
          {
            role: 'system',
            content:
              `${genderHint}` +
              `Grammatically improve this phrase: '${payload.phrase}'. ` +
              `The result should be in '${payload.language}'. ` +
              "Don't add additional information to the phrase.",
          },
        ],
        model: 'gpt-4o',
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.choices[0]?.message?.content;
  }
}
