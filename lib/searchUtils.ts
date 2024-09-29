import axios from 'axios';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

export async function searchInternet(query: string): Promise<string> {
  try {
    const response = await axios.get(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`);
    const results = response.data.organic_results.slice(0, 3);
    return results.map((result: any) => `Title: ${result.title}\nSnippet: ${result.snippet}\nLink: ${result.link}`).join('\n\n');
  } catch (error) {
    console.error('Error searching the internet:', error);
    return 'An error occurred while searching the internet.';
  }
}