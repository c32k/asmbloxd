# Introduction
Organized Assembly (org. asm), also known as Assembly-Bloxd (asmbloxd), is my version of assembly written in adaptation for the Bloxd Environment. The original interpretor source code is found in src/main.js. For the Bloxd Adapted version, go to src/bloxd/worldedit.txt, copy and paste the contents in a custom world's world code, view https://bloxd.io for more information.

# Use
*asmbloxd* was created for use in bloxd for general purpose programming. Memory is managed manually through a javascript Uint8Array with the size of 4096B, although this is always available to change. There are 8 registers, each containers for data within 32 bits. The main registers are R1-R7, followed by RSP, or the stack pointer. R0 is always available in place of 0, but its value cannot be changed. Memory can be either allocated to the main memory or the stack, which is decided by the user. The stack uses 1/4 of the main memory (1024B), and grows downward. Although currently, users can only change values of memory, further updates will bring more to the language, including syscalls.

# Syntax
*asmbloxd* contains the following keywords:
- mov: move values and memory around.
- add: add two values
- sub: subtract two values
- mul: multiply two values
- div: divide two values
- sec: define a section (eg. data, text)
- $: define a variable
These keywords are used with the following syntax:
**mov:** `mov <value>, <destination>`
  *value* can be a register whose value is passed, a variable, or a regular value
  *destination* can be a register or a memory address
**add:** `add <value>, <value>`
  *value* a number added to its partner
  note: for each math keyword, the value is stored in Register 5 (R5).
  note: this is the same syntax for each math keyword, the rest will be omitted.
**sec** `sec <section>`
  *section* the name of the section being defined
  note: defining sections more than once is undefined by the interpreter.
**$** `$ <name> <type> <value>`
  *name* the name of the variable
  *type* the type the variable is defined as. See types for more information
  *value* the value given to the variable
  note: variables are stored seperate from memory.

# Types
There are several valid types in *asmbloxd*.
- VOID: serves little to no purpose and anything with this type will not be allocated.
- BYTE: stores 8 bits of data in memory.
- CHAR: same as byte, but stores string ASCII data instead of numbers.
- UINT & INT: unsigned integer taking two bytes of memory.
- UINT4 & INT4: standard unsigned integer in most languages.
