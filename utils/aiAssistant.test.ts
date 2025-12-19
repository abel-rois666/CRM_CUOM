import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateContent } from './aiAssistant';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('aiAssistant Utils', () => {
    beforeEach(() => {
        fetchMock.mockClear();
    });

    describe('generateContent', () => {
        it('should return generated text on success', async () => {
            // Mock successful response
            const mockResponse = {
                ok: true,
                json: async () => ({
                    choices: [
                        { message: { content: 'Generated Text' } }
                    ]
                })
            };
            fetchMock.mockResolvedValue(mockResponse);

            const result = await generateContent('Write an intro');

            expect(result).toBe('Generated Text');
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(
                "https://openrouter.ai/api/v1/chat/completions",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it('should handle API errors gracefully', async () => {
            // Mock API error response
            const mockResponse = {
                ok: false,
                json: async () => ({ error: { message: 'Rate limit exceeded' } })
            };
            fetchMock.mockResolvedValue(mockResponse);

            // Based on implementation, it catches error and returns default message
            const result = await generateContent('Write something');

            // The function catches errors and returns "Error al conectar con la IA."
            expect(result).toBe('Error al conectar con la IA.');
        });

        it('should handle network exceptions gracefully', async () => {
            // Mock network failure
            fetchMock.mockRejectedValue(new Error('Network Error'));

            const result = await generateContent('Write something');

            expect(result).toBe('Error al conectar con la IA.');
        });
    });
});
