import logging
from typing import List, TypedDict, Optional, Any, Callable, Awaitable
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from app.models.schemas import SourceChunk

logger = logging.getLogger(__name__)

class GraphState(TypedDict):
    messages: List[BaseMessage]
    sources: List[SourceChunk]
    persona_prompt: str
    system_context: str
    model_name: str
    api_key: str
    base_url: str
    # A callable to retrieve context chunks given a query
    retriever_func: Optional[Callable[[str], Awaitable[List[SourceChunk]]]]

async def retrieve_node(state: GraphState):
    """Retrieve documents using the retriever function."""
    messages = state.get("messages", [])
    retriever = state.get("retriever_func")
    sources = []
    
    if retriever and messages:
        # Get the last human message
        last_msg = messages[-1]
        if isinstance(last_msg, HumanMessage):
            # Call document store retrieval
            chunks = await retriever(last_msg.content)
            if chunks:
                sources = chunks
                
    return {"sources": sources}

async def generate_node(state: GraphState):
    """Generate answer using LLM."""
    system_prompt = state.get("persona_prompt", "")
    system_ctx = state.get("system_context", "")
    sources = state.get("sources", [])
    
    doc_ctx = ""
    if sources:
        doc_ctx = "\n\n---\n\n".join(
            f'From "{s.doc_name}":\n{s.text}' for s in sources
        )
        
    full_sys = system_prompt
    if system_ctx:
        full_sys += f"\n\n{system_ctx}"
    if doc_ctx:
        full_sys += f"\n\n--- DOCUMENT CONTEXT ---\n{doc_ctx}"
        
    api_key = state.get("api_key") or "dummy-key"
    base_url = state.get("base_url")
    model_name = state.get("model_name", "llama-3.1-8b-instruct")
    
    # Strip litellm prefixes and set appropriate OpenAI-compatible base URLs
    if model_name.startswith("groq/"):
        model_name = model_name[5:]
        if not base_url:
            base_url = "https://api.groq.com/openai/v1"
    elif model_name.startswith("ollama/"):
        model_name = model_name[7:]
        if not base_url:
            base_url = "http://localhost:11434/v1"
    elif model_name.startswith("gemini/"):
        model_name = model_name[7:]
    
    if not base_url:
        base_url = None
        
    chat = ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        max_tokens=4000,
        temperature=0.7,
        streaming=True
    )
    
    msgs = []
    if full_sys:
        msgs.append(SystemMessage(content=full_sys))
    msgs.extend(state.get("messages", []))
    
    response = await chat.ainvoke(msgs)
    return {"messages": [response]}

workflow = StateGraph(GraphState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

graph_app = workflow.compile()
