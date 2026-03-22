import anthropic from './anthropic.svg';
import openai from './openai.svg';
import google from './google.svg';
import openrouter from './openrouter.svg';
import ark from './ark.svg';
import moonshot from './moonshot.svg';
import siliconflow from './siliconflow.svg';
import minimaxPortal from './minimax.svg';
import qwenPortal from './qwen.svg';
import cursor from './cursor.svg';
import githubCopilot from './github-copilot.svg';
import ollama from './ollama.svg';
import custom from './custom.svg';

export const providerIcons: Record<string, string> = {
    anthropic,
    openai,
    google,
    openrouter,
    ark,
    moonshot,
    siliconflow,
    'minimax-portal': minimaxPortal,
    'minimax-portal-cn': minimaxPortal,
    'qwen-portal': qwenPortal,
    cursor,
    'github-copilot': githubCopilot,
    ollama,
    custom,
};
