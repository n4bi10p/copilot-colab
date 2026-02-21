import React, { useState } from 'react';
import { backendClient } from './src/webview/utils/backendClient';

// AI Command Webview UI
export default function AICommandPanel() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Input validation
  const validateInput = (value: string) => {
    return value.trim().length > 0;
  };

  // Prompt template
  const buildPrompt = (input: string) => {
    return `Generate a project digest for: ${input}`;
  };

  // Use backendClient to call real AI command
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!validateInput(input)) {
      setError('Input required.');
      return;
    }
    setLoading(true);
    try {
      // TODO: Replace with actual projectId and constraints as needed
      const rawResponse = await backendClient.generateWbs({
        projectId: "demo-project-id", // Replace with real projectId
        goal: input,
        persist: true
      });
      const response = rawResponse as {
        notes?: string;
        generated?: any[];
      };
      setResponse(
        response.notes ||
        (response.generated ? JSON.stringify(response.generated, null, 2) : 'No tasks generated.')
      );
    } catch (err: any) {
      setError(err.message || 'AI command failed.');
    } finally {
      setLoading(false);
    }
  };

  // ...existing code...

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">AI Command (Digest Generator)</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="border p-2 w-full mb-2"
          placeholder="Enter project context..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Digest'}
        </button>
      </form>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {response && (
        <div className="mt-4">
          <h3 className="font-semibold">AI Response:</h3>
          <div className="bg-gray-100 p-2 rounded">{response}</div>
        </div>
      )}
    </div>
  );
}
