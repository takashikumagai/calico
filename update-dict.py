#!/usr/bin/env python3

with open('e2k.txt', 'r') as f:
  js_obj = 'const e2k = {' + f.read().replace('\n', ' ') + '};\n'

# Break the code into several lines
# for c in 'abcdefghijklmnopqrstuvwxz':
#   pos = js_obj.find(f"'{c}")
#   if pos != -1:
#     js_obj = js_obj[:pos] + '\\n' + js_obj[pos:]

#print(js_obj)

lines = None
with open('contentscript.js', 'r') as f:
  lines = f.readlines()

revised = ''
for line in lines:
  if line.startswith('const e2k'):
    revised += js_obj
  else:
    revised += line

# print(revised)

with open('contentscript.js', 'w') as g:
  g.write(revised)
