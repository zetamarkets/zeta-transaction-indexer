import { IntersectionTypeNode, Project, Type } from "ts-morph";
import { idl } from "@zetamarkets/sdk";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});
const sourceFile = project.createSourceFile(`./instruction-types.ts`, "", {
  overwrite: true,
});

interface idlType {
  name: string;
  type: string;
}

function parseType(input: idlType) {
  let type = input.type;
  if (typeof type === "object") {
    let objType = Object.keys(type)[0];
    switch (objType) {
      case "defined":
        type = type![objType];
        break;
      case "array":
        type = `${type![objType][0]}[]`;
        break;
      case "option":
        type = `${type![objType]} | undefined`;
        break;

      default:
        console.error("Not handled");

        break;
    }
  }
  // replace uint and int with number, anything above 32 goes to BN
  type = type.replace(/[iu]([4-9]\d|\d{3,})/, "anchor.BN");
  type = type.replace(/[iu][0-9]{1,3}/, "number");
  // replace bool with boolean
  type = type.replace(/bool/, "boolean");
  return { name: input.name, type };
}

// Custom types
idl.types.forEach((t) => {
  const interfaceDeclaration = sourceFile.addInterface({
    name: t.name,
  });
  interfaceDeclaration.setIsExported(true);
  if (t.type.kind == "struct") {
    t.type.fields.forEach((field, i) => {
      let property = parseType(field);
      interfaceDeclaration.insertProperty(i, property);
    });
  }
});

// Instruction interfaces
idl.instructions.forEach((ix) => {
  const interfaceDeclaration = sourceFile.addInterface({
    name: ix.name,
  });
  interfaceDeclaration.setIsExported(true);
  ix.args.forEach((arg, i) => {
    let property = parseType(arg);
    interfaceDeclaration.insertProperty(i, property);
  });
});

sourceFile.formatText();
project.save();
