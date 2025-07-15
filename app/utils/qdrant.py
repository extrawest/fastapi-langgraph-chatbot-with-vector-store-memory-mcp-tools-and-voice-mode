from typing import List, Dict, Any


def format_chat_results(points) -> List[Dict[str, Any]]:
    """Helper method to format Qdrant points into chat message objects.

    Args:
        points: List of Qdrant points from a scroll query

    Returns:
        List of formatted chat message objects
    """
    results = []
    for point in points:
        payload = point.payload
        content = payload.get("page_content", "")
        metadata = payload.get("metadata", "")

        user_msg = ""
        assistant_msg = ""
        if "User:" in content and "Assistant:" in content:
            parts = content.split("Assistant:")
            user_part = parts[0].strip()
            assistant_msg = parts[1].strip() if len(parts) > 1 else ""
            user_msg = user_part.replace("User:", "").strip()

        chat_msg = {
            "id": str(point.id),
            "user_message": user_msg,
            "assistant_message": assistant_msg,
            "timestamp": metadata.get("timestamp", ""),
            "chat_id": metadata.get("chat_id", ""),
            "user_id": metadata.get("user_id", "")
        }
        results.append(chat_msg)

    return results