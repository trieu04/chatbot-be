import { Injectable } from "@nestjs/common";
import { MessageRepository } from "../repositories/message.repository";
import { ConversationRepository } from "../repositories/conversation.repository";
import { AiService } from "./ai.service";
import { ChatService } from "./chat.service";
import { MessageEntity, MessageRole } from "../entities/message.entity";
import { SendMessageDto } from "../dtos/send-message.dto";
import { AiResponse, AiStreamChunk, AiStreamResponse } from "./ai-provider.interface";

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly aiService: AiService,
    private readonly chatService: ChatService,
  ) {}

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<{ userMessage: MessageEntity; assistantMessage: MessageEntity }> {
    // Verify conversation exists and belongs to user
    const conversation = await this.chatService.getConversationById(
      conversationId,
      userId,
    );

    // Create user message
    const userTokenCount = this.aiService.countTokens(dto.content);
    const userMessage = this.messageRepository.create({
      conversationId,
      role: MessageRole.USER,
      content: dto.content,
      tokenCount: userTokenCount,
    });

    await this.messageRepository.save(userMessage);

    // Get context messages for AI
    const contextMessages = await this.chatService.getRecentMessagesForContext(
      conversationId,
      conversation.maxTokens * 0.7, // Use 70% of max tokens for context
    );

    // Generate AI response
    const aiResponse = (await this.aiService.generateResponse(
      contextMessages,
      false,
    )) as AiResponse;

    // Create assistant message
    const assistantMessage = this.messageRepository.create({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: aiResponse.content,
      tokenCount: aiResponse.tokenCount,
    });

    await this.messageRepository.save(assistantMessage);

    // Update conversation token count
    await this.chatService.updateConversationTokens(conversationId);

    return {
      userMessage,
      assistantMessage,
    };
  }

  async sendMessageStreaming(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<{
    userMessage: MessageEntity;
    stream: AsyncIterable<string>;
  }> {
    // Verify conversation exists and belongs to user
    const conversation = await this.chatService.getConversationById(
      conversationId,
      userId,
    );

    // Create user message
    const userTokenCount = this.aiService.countTokens(dto.content);
    const userMessage = this.messageRepository.create({
      conversationId,
      role: MessageRole.USER,
      content: dto.content,
      tokenCount: userTokenCount,
    });

    await this.messageRepository.save(userMessage);

    // Get context messages for AI
    const contextMessages = await this.chatService.getRecentMessagesForContext(
      conversationId,
      conversation.maxTokens * 0.7,
    );

    // Generate AI streaming response
    const aiResponse = (await this.aiService.generateResponse(
      contextMessages,
      true,
    )) as AiStreamResponse;

    // We'll save the complete assistant message after streaming completes
    // For now, return the stream and userMessage
    return {
      userMessage,
      stream: this.wrapStreamWithSave(
        aiResponse.stream,
        conversationId,
      ),
    };
  }

  private async* wrapStreamWithSave(
    stream: AsyncIterable<AiStreamChunk>,
    conversationId: string,
  ): AsyncIterable<string> {
    let fullContent = "";

    for await (const chunk of stream) {
      const text = chunk.text || "";
      fullContent += text;
      yield text;
    }

    // After streaming completes, save the assistant message
    const tokenCount = this.aiService.countTokens(fullContent);
    const assistantMessage = this.messageRepository.create({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: fullContent,
      tokenCount,
    });

    await this.messageRepository.save(assistantMessage);
    await this.chatService.updateConversationTokens(conversationId);
  }

  async searchMessages(
    userId: string,
    keyword: string,
    filters: {
      conversationId?: string;
      startDate?: string;
      endDate?: string;
    },
    page: number,
    limit: number,
  ) {
    const { items, total } = await this.messageRepository.searchMessages(
      userId,
      keyword,
      filters,
      page,
      limit,
    );

    return {
      items,
      pagination: {
        page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
