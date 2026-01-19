/**
 * Mock AI SDK generateText response
 */
export function mockGenerateText(response: string) {
  return jest.fn().mockResolvedValue({
    text: response,
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
    finishReason: 'stop',
  });
}

/**
 * Mock AI SDK streamText response
 */
export function mockStreamText(chunks: string[]) {
  return jest.fn().mockResolvedValue({
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
    usage: Promise.resolve({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    }),
    finishReason: Promise.resolve('stop'),
  });
}

/**
 * Mock AI tool execution result
 */
export function mockToolExecution(toolName: string, result: any) {
  return {
    toolName,
    toolCallId: `call_${Math.random().toString(36).substring(7)}`,
    result,
  };
}

/**
 * Creates mock AI provider
 */
export function createMockAIProvider() {
  return {
    generateText: mockGenerateText('This is a mock AI response.'),
    streamText: mockStreamText(['This ', 'is ', 'a ', 'mock ', 'stream.']),
    generateObject: jest.fn().mockResolvedValue({
      object: { key: 'value' },
    }),
  };
}

/**
 * Mock embedding generation
 */
export function mockEmbedding(dimensions: number = 1536) {
  return Array(dimensions).fill(0).map(() => Math.random());
}
