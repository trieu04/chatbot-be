import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AiProvider,
  AiMessage,
  AiResponse,
  AiStreamResponse,
  AiStreamChunk,
  Citation,
} from "./ai-provider.interface";

@Injectable()
export class Ai4lifeAiProvider extends AiProvider {
  private readonly logger = new Logger(Ai4lifeAiProvider.name);
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    super();
    this.apiUrl = this.configService.get<string>("AI4LIFE_API_URL")
      || "http://localhost:8000";
  }

  async generateResponse(
    messages: AiMessage[],
    streaming = false,
  ): Promise<AiResponse | AiStreamResponse> {
    if (streaming) {
      return this.generateStreamingResponse(messages);
    }

    return this.generateNonStreamingResponse(messages);
  }

  private async generateNonStreamingResponse(
    messages: AiMessage[],
  ): Promise<AiResponse> {
    try {
      // Get the last user message as the question
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      const response = await fetch(`${this.apiUrl}/rag/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: lastUserMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI4Life API error: ${response.statusText}`);
      }

      // Collect full response from stream
      let fullContent = "";
      const citations: Citation[] = [];

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(line => line.trim());

          for (const line of lines) {
            if (line === "data: [DONE]") {
              break;
            }

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6); // Remove "data: " prefix
                const data = JSON.parse(jsonStr);

                if (data.text) {
                  const { text, extractedCitations } = this.parseTextAndCitations(data.text);
                  fullContent += text;
                  citations.push(...extractedCitations);
                }
              }
              catch (error) {
                // Skip invalid JSON lines
                this.logger.warn(`Failed to parse SSE line: ${line}`, error);
              }
            }
          }
        }
      }
      finally {
        reader.releaseLock();
      }

      const tokenCount = this.countTokens(fullContent);

      return {
        content: fullContent,
        tokenCount,
        citations,
      };
    }
    catch (error) {
      this.logger.error("Error calling AI4Life API", error);
      throw error;
    }
  }

  private async generateStreamingResponse(
    messages: AiMessage[],
  ): Promise<AiStreamResponse> {
    try {
      // Get the last user message as the question
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      const response = await fetch(`${this.apiUrl}/rag/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: lastUserMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI4Life API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      const logger = this.logger;
      const parseTextAndCitations = this.parseTextAndCitations.bind(this);

      const stream = async function* (): AsyncIterable<AiStreamChunk> {
        try {
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            // Keep the last incomplete line in buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) {
                continue;
              }

              if (trimmedLine === "data: [DONE]") {
                return;
              }

              if (trimmedLine.startsWith("data: ")) {
                try {
                  const jsonStr = trimmedLine.substring(6); // Remove "data: " prefix
                  const data = JSON.parse(jsonStr);

                  if (data.text) {
                    // Parse text and extract inline citations
                    const { text, extractedCitations } = parseTextAndCitations(data.text);

                    // Yield text chunk
                    if (text) {
                      yield { text, citation: undefined };
                    }

                    // Yield each citation as a separate chunk
                    for (const citation of extractedCitations) {
                      yield { text: "", citation };
                    }
                  }
                }
                catch (error) {
                  // Skip invalid JSON lines
                  logger.warn(`Failed to parse SSE line: ${trimmedLine}`, error);
                }
              }
            }
          }
        }
        finally {
          reader.releaseLock();
        }
      };

      return {
        stream: stream(),
        totalTokens: 0, // Will be calculated after streaming completes
      };
    }
    catch (error) {
      this.logger.error("Error calling AI4Life API (streaming)", error);
      throw error;
    }
  }

  /**
   * Parse text and extract inline JSON citations
   * Returns cleaned text and array of citations
   */
  private parseTextAndCitations(text: string): {
    text: string;
    extractedCitations: Citation[];
  } {
    const citations: Citation[] = [];
    let cleanedText = text;

    // Regular expression to match JSON objects in the text
    // Matches {...} that appear to be citation objects
    const citationRegex = /\{[^{}]*"start_char"[^{}]*\}/g;

    const matches = text.matchAll(citationRegex);

    for (const match of matches) {
      try {
        const citationJson = match[0];
        const citation = JSON.parse(citationJson) as Citation;

        // Validate that it's a citation object (must have start_char and end_char)
        if (citation.start_char !== undefined && citation.end_char !== undefined) {
          citations.push(citation);

          // Remove the citation JSON from the text
          cleanedText = cleanedText.replace(citationJson, "");
        }
      }
      catch {
        // Not a valid citation JSON, skip
      }
    }

    return {
      text: cleanedText,
      extractedCitations: citations,
    };
  }

  countTokens(text: string): number {
    // Simple approximation: ~4 characters per token for Vietnamese/English
    // For production, use a proper tokenizer library
    return Math.ceil(text.length / 4);
  }
}
