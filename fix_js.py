import re

with open(r'js\views\invoices.js', 'r', encoding='utf-8') as f:
    t = f.read()

# Replace any \"\\\`\" with \"\`\"
t = t.replace(r'\`', '`')
# Replace any \"\\\$\" with \"\$\"
t = t.replace(r'\$', '$')
# Replace any \"\\\\n\" with \"\\n\" but only if literal! Wait, write_to_file uses literal string encoding?
# Let's just fix what we know is broken.

# Wait, the modal HTML had \n replaced by \\n :  notesEl.innerHTML = '<b style="color:var(--text-main);">Return Tracking / Audit Log:</b><br>' + String(invData.notes).replace(/\\n/g, '<br>');
# If the literal code had \\n, that's correct for a Regex in javascript! `/\n/g` matching newlines in JS uses `/\n/g`.
# So `replace(/\\n/g, '<br>')` actually matched literal `\n`.
# What about backticks? \` was actually inserted because my write_to_file generated `\`` ?
# A literal `\`` would be `\` followed by `` ` ``.

with open(r'js\views\invoices.js', 'w', encoding='utf-8') as f:
    f.write(t)
