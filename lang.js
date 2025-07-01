/*
    Credits to c32k, view asmb repository at
    https://github.com/c32k/asmbloxd/
    
    Protected by the MIT License
*/

const MEM_SIZE = 4096; // 4096 Bytes
const REG_SIZE = 16; // 8 Registers, 512 Bytes
const STACK_END = MEM_SIZE - MEM_SIZE / 4 // Stack limit at 1KB
const mem = new Uint8Array(MEM_SIZE);
const reg = new Int32Array(REG_SIZE);

reg[REG_SIZE - 1] = MEM_SIZE; // Stack grows downward

const memref = {}; // Store references
let lastPushedString;

const types = {
  'BIT': 1,
  'BYTE': 8,
  'INT': 16,
  'INT4': 32,
  'INT8': 64,
  'PTR': 2
}

function err(msg) {
  throw new Error(msg + '\n');
}

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.log("Warning: " + msg + '\n');
}

function createHeader(type, signed = 0, tags = 0) {
  let size;
  let header = 0;

  if (type === 'BIT') size = 0;
  else size = types[type] / 8

  if (tags != 0 && tags < 11) {
    switch (tags) {
      case 1:
        signed = 0;
        break;
      case 2:
        signed = 1;
        break;
    }
  }
  header |= ((size) & 0x07);
  header |= ((signed ? 1 : 0) << 3);
  header |= (0 << 4)
  return header;
}

function strToByte(src) {
  const encoded = [];
  const ltr = src.split('');
  if (!isNaN(src)) {
    err("Numeric Value passed to string parser");
    return null;
  }
  for (const l of ltr) {
    encoded.push(l.charCodeAt());
  }
  encoded.push(0); // null terminator
  return encoded;
}


function getNumType(num) {
  if (!Number.isInteger(num)) {
    err("Size parser only accepts numbers");
  }
  let size;
  let isSigned;

  if (num >= 0) {
    if (num < 2) size = 1;
    else if (num < 256) size = 8;
    else if (num < 65536) size = 16;
    else if (num < 4294967296) size = 32;
    else size = 64;
    isSigned = false;
  } else {
    if (num >= -128) size = 8;
    else if (num >= -32768) size = 16;
    else if (num >= -2147483648) size = 32;
    else size = 64;
    isSigned = true;
  }

  const keyName = Object.keys(types).find(key => types[key] === size);
  return [keyName, isSigned];
}

function smartSplit(input) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let inDQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === `"` && !inQuotes) {
      current += char;
      inDQuotes = !inDQuotes;
      continue;
    } else if (char === `'` && !inDQuotes) {
      current += char;
      inQuotes = !inQuotes;
      continue;
    }

    if (/\s/.test(char) && !inQuotes && !inDQuotes) {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  for (let i = 0; i < result.length; i++) {
    if (!isNaN(result[i])) result[i] = +result[i];
    else if (result[i] == ',') result.splice(i, 1);
    else if (result[i].includes(",")) result[i] = result[i].replace(',', '');
    else if (result[i].includes(';')) {
      for (let j = 0; j < i; j++) {
        result.pop();
      }
      if (result[i] === ';') result.pop();
    }
  }
  return result;
}

class Stack {
  push(value) {
    if (Array.isArray(value)) {
      const size = value.length;
      if (reg[REG_SIZE - 1] - size < STACK_END) {
        err("Stack Overflow");
      }

      reg[REG_SIZE - 1] -= size;
      for (let i = 0; i < size; i++) {
        mem[reg[REG_SIZE - 1] + i] = value[i];
      }
      if (mem[reg[REG_SIZE - 1] + size - 1] == 0) {
        log(`[ASMB] Pushed ${size} bytes to stack`);
      } else {
        log(`Could not push string of size ${size}B to stack`);
      }
      lastPushedString = true;
      return;
    }
    if (!isNaN(value)) {
      const typedata = getNumType(value);
      const size = types[typedata[0]] / 8;
      log(`${value} identified as type ${typedata[0]} with size of ${size}B`);
      if (reg[REG_SIZE - 1] - (size + 1) < STACK_END) {
        err("Stack Overflow");
      }

      if (size === 0.125) {
        mem[reg[REG_SIZE - 1]] = createHeader(typedata[0], typedata[1], value + 1);
        reg[REG_SIZE - 1]--;
      } else {
        reg[REG_SIZE - 1] -= size + 1;
        mem[reg[REG_SIZE - 1]] = createHeader(typedata[0], typedata[1]);
      }
      for (let i = 0; i < size; i++) {
        mem[(reg[REG_SIZE - 1] + i) + 1] = (value >> (8 * i)) & 0xFF; // little endian
      }
      if ((mem[reg[REG_SIZE - 1]] & 0xF0) == 0) {
        log(`[ASMB] Pushed ${value} to stack`)
      } else {
        log(`Could not push ${size}B to stack`);
      }
      lastPushedString = false;
      return;
    }
  }
  pop() {
    if (reg[REG_SIZE - 1] === MEM_SIZE) {
      log("Nothing to pop, returned 0");
      return 0;
    }
    if (typeof lastPushedString === 'undefined') {
      if ((mem[reg[REG_SIZE - 1]].toString(2) & 0xF0) === 0) lastPushedString = false;
      else lastPushedString = true;
    }

    if (lastPushedString) {
      const str = [];
      for (let i = 0; mem[reg[REG_SIZE - 1] + i] != 0; i++) {
        if (reg[REG_SIZE - 1] + i < STACK_END) err("Stack Overflow");

        str.push(String.fromCharCode(mem[reg[REG_SIZE - 1] + i]));
      }
      reg[REG_SIZE - 1] += str.length + 1;
      return str.join('');
    }
    if (!lastPushedString) {
      if ((mem[reg[REG_SIZE - 1]] & 0b111) == 0 && (mem[reg[REG_SIZE - 1]] & 0xF0 == 0)) {
        return (mem[reg[REG_SIZE - 1]] >> 3) & 1;
      }
      const size = (mem[reg[REG_SIZE - 1]] & 0b111);
      let num = 0;
      for (let i = 0; i < size; i++) {
        num |= mem[reg[REG_SIZE - 1] + i + 1] << (8 * i);
      }
      reg[REG_SIZE - 1] -= size;
      return num;
    }
  }
}
class Memory {
  write(start, val) {
    if (start < 0 || start > STACK_END) err("Cannot write to specified address");

    if (Array.isArray(val)) { // string
      const size = val.length;
      if (start + size > STACK_END) err("Address out of bounds of memory");

      for (let i = 0; i < size; i++) {
        mem[start + i] = val[i];
        if (i == size - 1 && mem[start + i] === 0) {
          log(`Successfully uploaded string (${size}B) to memory`);
        }
      }
    }
    if (typeof val === 'number') { // number
      const typedata = getNumType(val);
      const size = types[typedata[0]] / 8;
      if (start + size + 1 > STACK_END) err("Address out of bounds of memory");
      if (size === 0) return;
      mem[start] = createHeader(typedata[0], typedata[1]);
      start++;
      for (let i = 0; i < size; i++) {
        mem[start + i] = (val >> (8 * i)) & 0xFF;
      }
      if ((mem[start - 1] & 0xF0) === 0) {
        log(`Successfully wrote value ${val} to address ${start -1}`);
      } else {
        err("Could not write " + val + " to memory");
      }
    }
  }
  read(adr) {
    if ((mem[adr] & 0xF0) == 0 && (mem[adr] & 0b111) == 0) {
      return (mem[adr] >> 3) & 1;
    }
    if ((mem[adr] & 0xF0) == 0) { // number
      const size = (mem[adr] & 0x07) + 1; // + 1 for header
      adr++; // move past header to first byte
      let num = 0;
      for (let i = 0; i < size; i++) {
        // makes num a long line of binary
        num |= mem[adr + i] << (8 * i)
      }
      return num;
    }
    // for strings
    const str = [];
    for (let i = 0; mem[adr + i] != 0; i++) {
      if (adr + i > STACK_END) err("Could not find null terminator");
      str.push(String.fromCharCode(parseInt(mem[adr + i], 2)));
    }
  }
}
class RegisterSystem {
  fetch(register) {
    if (typeof register !== 'string') err("Invalid Register called");

    register = register.toUpperCase();

    if (!register.startsWith('R')) {
      err(`Cannot fetch register "${register}"`);
    }

    switch (register) {
      case 'R0':
        return reg[0];
      case 'RSP':
        return reg[REG_SIZE - 1];
      case 'RFLAGS':
        return reg[REG_SIZE - 2];
    }

    let num = register.replace('R', '');
    num = +num;

    if (isNaN(num) || num < 0 || num > REG_SIZE - 2) {
      err(`Not a valid register "${register}"`);
    }

    return reg[num];
  }

  change(register, value) {
    if (isNaN(value)) {
      err("Cannot set register to non-numerical value");
    }
    if (value > 2147483647 || value < -2147483647) {
      err("Cannot set register to value outside of 32-bit signed integer limit");
    }

    if (typeof register === 'string') {
      switch (register) {
        case 'RSP':
          warn("Changing the stack pointer is undefined behavior. Here be dragons!");
          reg[REG_SIZE - 1] = value;
          return;
          break;
        case 'RFLAGS':
          reg[REG_SIZE - 2] = value;
          return;
          break;
      }
      const index = register.replace('R', '');
      if (!isNaN(+index) && (+index) > 0 && (+index) < REG_SIZE - 2) {
        reg[index] = value;
        log(`Successfully changed register "R${index}" to ${reg[index]}`);
        return;
      }
    }

    if (isNaN(register) || register < 0 || register > REG_SIZE - 2) {
      err(`Cannot change register "${register}"`);
    }
    reg[register] = value;
    log(`Successfully changed register "${register}" to ${value}`);
    return;
  }
}

const stack = new Stack;
const memory = new Memory;
const regsys = new RegisterSystem;

function parseop(op) {
  if (typeof op === 'number') {
    return {
      type: 'num',
      val: op
    };
  }
  if (typeof op !== 'string') {
    err(`Unsupported operand type: ${typeof op}`);
  }

  op = op.trim(); // trim whitespaces

  // Handle values of either memory or registers
  if (/^\[.*\]$/.test(op)) {
    const inner = op.slice(1, -1).trim(); // remove brackets and whitespaces

    // If a register is in brackets, its value is passed
    if (/^R(\d+|[A-Z]+)$/i.test(inner)) {
      return {
        type: 'num',
        val: regsys.fetch(inner)
      };
    }

    if (!isNaN(inner) && typeof(+inner) === 'number') {
      if ((+inner) < 0 || (+inner) > STACK_END) {
        err(`Memory address out of bounds: ${addr}`);
      }
      return {
        type: 'num',
        val: memory.read((+inner))
      };
      // in any case, returns the value of a memory address
    }

    err(`Invalid reference to memory: [${inner}]`);
  }

  if (/^R(\d+|[A-Z]+)$/i.test(op)) {
    return {
      type: 'reg',
      val: op.toUpperCase()
    };
  }

  // String literals, only acceptable as values
  if (/^".*"$/.test(op)) {
    return {
      type: 'str',
      val: op.slice(1, -1)
    };
  }

  // Immediate values, could be a memory address
  if (!isNaN(op)) {
    return {
      type: 'num',
      val: +op
    };
  }

  err(`Unrecognized operand: ${op}`);
}


function parseln(ln) {
  if (typeof ln !== 'string') err("Incorrect input type");

  const sec = smartSplit(ln);
  if (!Array.isArray(sec) || sec.length === 0) err("Parsing line failed");

  const instr = sec[0].toLowerCase();
  const ops = sec.slice(1).map(parseop); // All operands parsed

  switch (instr) {
    case "mov":
      if (ops.length !== 2) err("Instruction mov expects 2 arguments");

      const [dst, src] = ops;
      let srcVal;

      if (src.type === 'num') {
        srcVal = src.val;
      } else if (src.type === 'str') {
        srcVal = src.val
      } else if (src.type === 'reg') {
        err("Cannot pass register name as value");
      } else {
        err("Unsupported source operand for mov");
      }

      if (dst.type === 'num') {
        memory.write(dst.val, srcVal);
      } else if (dst.type === 'reg') {
        regsys.change(dst.val, srcVal);
      } else {
        err("Invalid destination " + dst.val);
      }
      break;

    case "push":
      if (ops.length !== 1) err("push expects 1 argument");
      const op = ops[0];

      if (op.type === 'num') {
        stack.push(op.val);
      } else if (op.type === 'str') {
        stack.push(strToByte(op.val));
      } else if (op.type === 'reg') {
        err("Cannot pass register name as value");
      } else {
        err("Unsupported operand for push");
      }
      break;

    case "pop":
      if (ops.length !== 1) err("pop expects 1 argument");

      const target = ops[0];
      const val = stack.pop();

      if (target.type === 'num') {
        memory.write(target.val, val);
      } else if (target.type === 'reg') {
        regsys.change(target.val, val);
      } else {
        err("Invalid pop target");
      }
      break;

    case "add":
      if (ops.length !== 2) err("Expected 2 arguments");

      const [addVal, addSrc] = ops;
      let addOS;

      if (addSrc.type === 'num') {
        addOS = addSrc.val
      } else if (addSrc.type === 'str') {
        err("Cannot add strings");
      } else if (addSrc.type === 'reg') {
        err("Cannot pass Register Names as offsets");
      } else {
        err("Unnacceptable addition offset");
      }

      if (addVal.type === 'num') {
        memory.write(addVal.val, memory.read(addVal.val) + addOS);
      } else if (addVal.type === 'reg') {
        regsys.change(addVal.val, regsys.fetch(addVal.val) + addOS);
      }
      break;

    case "sub":
      if (ops.length !== 2) err("Expected 2 arguments");

      const [subVal, subSrc] = ops;
      let subOS;

      if (subSrc.type === 'num') {
        subOS = subSrc.val;
      } else if (subSrc.type === 'reg') {
        err("Cannot pass Register Names as offsets");
      } else {
        err("Unnacceptable subtraction offset");
      }

      if (subVal.type === 'num') {
        memory.write(subVal.val, memory.read(subVal.val) - subOS);
      } else if (subVal.type === 'reg') {
        regsys.change(subVal.val, regsys.fetch(subVal.val) - subOS);
      }
      break;

    case ";" + sec[0]?.substring(1):
      break;

    default:
      err(`Unrecognized instruction "${instr}"`);
  }
}

/* END OF FILE */
