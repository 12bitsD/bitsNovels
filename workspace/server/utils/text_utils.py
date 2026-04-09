import re


def calculate_char_count(html_content: str) -> int:
    text_only = re.sub(r"<[^>]+>", "", html_content)
    text_only = " ".join(text_only.split())
    count = 0
    for char in text_only:
        if "\u4e00" <= char <= "\u9fff":
            count += 1
        elif char.isalnum():
            count += 1
    return count
