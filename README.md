# Introduction
Organized Assembly (org. asm), also known as Assembly-Bloxd (asmbloxd), is my version of assembly written in adaptation for the Bloxd Environment. View https://bloxd.io for more information on Bloxd.io.

# Use
*asmbloxd* was created for use in bloxd for general purpose programming. Memory is managed manually through a javascript Uint8Array with the size of 4096B, although this is always available to change. There are 16 registers, each containers for data within 32 bits. The main registers are R1-R10, followed by RSP, or the stack pointer. R0 is the return value register, (0 indicating successful return) and will later be in use as asmb is expanded into multple lines. Memory can be either allocated to the main memory or the stack, which is decided by the user. The stack uses 1/4 of the main memory (1024B), and grows downward. Although currently, users can only change values of memory, further updates will bring more to the language, including syscalls.

# Syntax
*asmbloxd* contains several syntax features. When referring to the value of a memory address, use brackets (eg. [R1], [1024]). The standard syntax of a line in *asmbloxd* is an instruction followed by its operands, which are the inputs. Operands are split using commas, but it is not necesssary as they are automatically parsed regardless of whether there is commas.

# Types
There are several valid types in *asmbloxd*.
- VOID: serves little to no purpose and anything with this type will not be allocated.
- BYTE: stores 8 bits of data in memory.
- CHAR: same as byte, but stores string ASCII data instead of numbers.
- UINT & INT: integer taking two bytes of memory.
- UINT4 & INT4: standard unsigned integer in most languages (IEEE754).
- PTR: currently not in use, but will later be implemented in future updates. Will take up two bytes of memory.
