# Cloud AI - web only edition

## Goal

Create a small AI friend for my nine year old daughter, the AI friend is called Cloud (gender female). This project runs completely in the browser, no backend logic for now.
It has a character avatar generated in the browser with some cute animations such as surprise, happy, sad, blush. I'm considering CSS / SVG sprite for the animated character
Cute chat interface where she can type and see responses. Character avatar at the top with the chat interface below.
Simple memory system, with facts and preferences and the like extracted using the utility model as content scrolls out of the context window and inject along the rolling context window (context window defined in settings).
Image generation - In the past I used Huggingface Inference client in python, but I am not sure how we do this from within the browser.
Huggingface API key, Image generation model, TTS and STT and Main and utility models specified in Settings menu.
TTS and STT - we can consider huggingface, however, I am open to suggestions for the most elegant solution.

## Specifications

LLM inference via OpenAI compatible API
Character personality specified in prompt in settings.
Image generation via Huggingface. See sample code block below, this is the way I used to do it in python, your research may offer a good alternative for browser implementation.

```gen_image.py
import os
import sys
import re
from huggingface_hub import InferenceClient
from PIL import Image

def generate_image(prompt, width="1280", height="720", output_dir="./generated_images/"):
    token = os.environ.get("HF_TOKEN")
    if not token:
        print("Error: HF_TOKEN not found in environment.")
        return

    client = InferenceClient(provider="auto", api_key=token)

    # ✨ GENIUS FILENAME LOGIC ✨
    clean_name = prompt.lower().replace(" ", "_")
    clean_name = re.sub(r'[^a-z0-9_]', '', clean_name)
    clean_name = clean_name[:50]

    filename = f"{clean_name}_uw.png" # Added _uw for ultra-wide!
    output_path = os.path.join(output_dir, filename)

    print(f"Generating image ({width}x{height}): {prompt}...")
    try:
        image = client.text_to_image(
            prompt,
            width=width,
            height=height,
            model="Tongyi-MAI/Z-Image-Turbo",
        )

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        image.save(output_path)
        print(f"Success! Saved to {output_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gen_image.py \"<prompt>\" [width] [height]")
    else:
        prompt = sys.argv[1]
        width = sys.argv[2] if len(sys.argv) > 2 else "1280"
        height = sys.argv[3] if len(sys.argv) > 3 else "720"
        generate_image(prompt, width=width, height=height)

```

STT and TTS open to your suggestions.
If possible, add a dropdown in settings to select the image generation and TTS and STT models as well as dropdowns to select the OpenAI Compatible inference main and utility models.

Create a git repository and commit milestones achieved.
Create and keep README.md and design documents in docs folder up to date.
Separate the project into easily maintainable modular components where it makes sense.

Ask any clarification questions.
Build a detailed plan for the implementation broken into phases before commencing work.
