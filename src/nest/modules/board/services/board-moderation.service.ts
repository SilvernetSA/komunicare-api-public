import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { MailGatewayService } from '../../../common/mail-gateway.service';
import { MIN_REPORT_REASON_LENGTH } from '../../../common/moderation-report.constants';
import { PublicBoardReportPersistenceEntity } from '../../../common/models/public-board-report.persistence-model';
import { BoardRepository } from '../board.repository';
import { ReportPublicBoardDto } from '../dto/report-public-board.dto';
import { BoardActionResponse } from '../models/board.model';

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = String(value || '').trim();
  return normalized || undefined;
};

@Injectable()
export class BoardModerationService {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly mailGateway: MailGatewayService,
  ) {}

  private async findBoardById(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID for a Board. Board Id: ${id}`);
    }
    const board = await this.boardRepository.findById(id);
    if (!board) {
      throw new NotFoundException(`Board does not exist. Board Id: ${id}`);
    }
    return board;
  }

  async reportPublicBoard(
    payload: ReportPublicBoardDto,
  ): Promise<BoardActionResponse> {
    const board = await this.findBoardById(payload.id);
    const normalizedReason = String(payload.reason || '').trim();

    if (!board.isPublic) {
      throw new BadRequestException('Only public boards can be reported.');
    }

    if (normalizedReason.length < MIN_REPORT_REASON_LENGTH) {
      throw new BadRequestException(
        `Report reason must include at least ${MIN_REPORT_REASON_LENGTH} characters.`,
      );
    }

    const supportEmail =
      process.env.KOMUNICARE_SUPPORT_EMAIL || 'info@komuni.care';
    const whistleblowerName = payload.whistleblower?.name || 'Unknown';
    const whistleblowerEmail = payload.whistleblower?.email || 'Unknown';
    const whistleblowerLanguage = payload.whistleblower?.language || 'Unknown';

    const report = new PublicBoardReportPersistenceEntity({
      boardId: String(board.id || board._id || payload.id),
      boardName: board.name,
      author: board.author,
      ownerEmail: board.email,
      reason: normalizedReason,
      url: payload.url.trim(),
      whistleblower: {
        name: normalizeOptionalString(payload.whistleblower?.name),
        email: normalizeOptionalString(payload.whistleblower?.email),
        language: normalizeOptionalString(payload.whistleblower?.language),
      },
      adminComment: '',
      metadata: {
        description: payload.description,
        payloadName: payload.name,
        payloadAuthor: payload.author,
        isPublic: Boolean(board.isPublic),
        ownerEmail: board.email,
      },
    });

    await report.save();

    const html = `
      <h1>Public board report</h1>
      <p>A public board was reported from Komunicare.</p>
      <h2>Board</h2>
      <ul>
        <li><strong>Name:</strong> ${payload.name}</li>
        <li><strong>Author:</strong> ${payload.author}</li>
        <li><strong>Description:</strong> ${payload.description}</li>
        <li><strong>Board ID:</strong> ${payload.id}</li>
        <li><strong>Board URL:</strong> ${payload.url}</li>
        <li><strong>Stored owner email:</strong> ${board.email}</li>
      </ul>
      <h2>Report</h2>
      <p>${payload.reason}</p>
      <h2>Whistleblower</h2>
      <ul>
        <li><strong>Name:</strong> ${whistleblowerName}</li>
        <li><strong>Email:</strong> ${whistleblowerEmail}</li>
        <li><strong>Language:</strong> ${whistleblowerLanguage}</li>
      </ul>
    `;

    const result = await this.mailGateway.sendEmail(
      supportEmail,
      `[Komunicare] Reported public board: ${payload.name}`,
      html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: 'Error sending board report email.',
        error:
          (result as any).error instanceof Error
            ? (result as any).error.message
            : 'Unknown error',
      });
    }

    return {
      success: 1,
      message: 'Mail sent successfully',
    };
  }
}
