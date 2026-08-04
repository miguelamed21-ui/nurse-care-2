import os
from openai import AsyncOpenAI

# Cliente async apuntando al router de Hugging Face
hf_client = AsyncOpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ.get("HF_TOKEN"),
)

LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-ai/DeepSeek-V4-Pro:fastest")


async def chat_completion(
    system_message: str,
    user_message: str,
    session_id: str = None,
    stream: bool = False
):
    """
    Reemplaza LlmChat de emergentintegrations.
    Compatible con el flujo de simulaciones y evaluaciones.
    """
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]

    if stream:
        # Para streaming SSE (usado en /simulations/{id}/chat)
        response = await hf_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            stream=True,
        )
        return response
    else:
        # Para generación de casos y evaluaciones
        response = await hf_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            stream=False,
        )
        return response.choices[0].message.content
