<img width="1920" height="1080" alt="adobe-scripts" src="https://github.com/user-attachments/assets/c0ddb48e-f837-4bf8-ba0d-0a80ca0159d8" />

# adobe-scripts

Random scripts I've written to automate repetitive tasks in Adobe apps. Nothing fancy, just things that saved me time and might save you some too.

Currently focused on **Illustrator**, but other apps will show up as needed.

This is an evolution of an earlier repo, [tahoedesigner/ExtendScript](https://github.com/tahoedesigner/ExtendScript), which was a beginner intro to scripting Photoshop CC. This one's less "getting started" and more "here's a thing that does a thing."

---

## Scripts

### Illustrator

Scripts live in the `/illustrator` folder. Each one is standalone, drop it in and run it.

| Script | What it does |
|--------|-------------|
| design-system-reference.jsx | Extracts all contents of an illustrator file into a design system reference as a PDF. |
| extract-iems-by-artboard.jsx | Extracts artboard contents to a csv. |
| generate-artboards.jsx | Generates selective artboards in industry standard sizes. |

---

## How to Run a Script

**Option A: Install it:**

1. Copy the `.jsx` file into your Illustrator Scripts folder:
   - **Mac:** `/Applications/Adobe Illustrator [version]/Presets/Scripts/`
   - **Win:** `C:\Program Files\Adobe\Adobe Illustrator [version]\Presets\en_US\Scripts\`
2. Restart Illustrator
3. Run via `File > Scripts > [Script Name]`

**Option B: Just run it once:**

`File > Scripts > Other Script…` then navigate to the file, done.

---

## Resources

- [Illustrator Scripting Guide](https://www.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/AI_ScriptGuide_JS.pdf)
- [Illustrator JavaScript Reference](https://www.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/Illustrator_JavaScript_Scripting_Reference.pdf)
- [Community Scripting Docs](https://illustrator-scripting-guide.readthedocs.io/)

---

## Author

Jeff Davis ([@0xjdavis](https://github.com/0xjdavis)), previously [@tahoedesigner](https://github.com/tahoedesigner)

## License

[MIT](LICENSE)
<img width="1920" height="1080" alt="adobe-scripts" src="https://github.com/user-attachments/assets/720e605c-252b-49e7-a3be-5ad6b7b73377" />
