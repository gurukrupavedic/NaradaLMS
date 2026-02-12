export async function handleJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
    if (response.ok) return response.json() as Promise<T>;
    try {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || errorBody.error || fallbackMessage);
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error(fallbackMessage);
    }
}
