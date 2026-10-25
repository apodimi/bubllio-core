/** Validates the JSON Schema features used by the versioned installation contract. */
export function validateJsonSchema(instance, schema) {
  const errors = [];
  visit(instance, schema, "$", schema, errors);
  return errors;
}

function visit(value, definition, path, root, errors) {
  if (definition.$ref) {
    visit(value, resolveReference(definition.$ref, root), path, root, errors);
    return;
  }
  if (
    definition.not &&
    validateFragment(value, definition.not, root).length === 0
  ) {
    errors.push(`${path} matches a forbidden schema`);
  }
  if (definition.const !== undefined && value !== definition.const) {
    errors.push(`${path} must equal ${JSON.stringify(definition.const)}`);
    return;
  }
  if (definition.type && !matchesType(value, definition.type)) {
    errors.push(`${path} must be ${definition.type}`);
    return;
  }
  if (typeof value === "string")
    validateString(value, definition, path, errors);
  if (typeof value === "number")
    validateNumber(value, definition, path, errors);
  if (Array.isArray(value))
    validateArray(value, definition, path, root, errors);
  if (isObject(value)) validateObject(value, definition, path, root, errors);
}

function validateString(value, definition, path, errors) {
  if (
    definition.minLength !== undefined &&
    value.length < definition.minLength
  ) {
    errors.push(`${path} is shorter than ${definition.minLength}`);
  }
  if (
    definition.maxLength !== undefined &&
    value.length > definition.maxLength
  ) {
    errors.push(`${path} is longer than ${definition.maxLength}`);
  }
  if (definition.pattern && !new RegExp(definition.pattern, "u").test(value)) {
    errors.push(`${path} does not match its required pattern`);
  }
  if (definition.format === "uri") {
    try {
      new URL(value);
    } catch {
      errors.push(`${path} must be a URI`);
    }
  }
}

function validateNumber(value, definition, path, errors) {
  if (definition.minimum !== undefined && value < definition.minimum) {
    errors.push(`${path} must be at least ${definition.minimum}`);
  }
  if (definition.maximum !== undefined && value > definition.maximum) {
    errors.push(`${path} must be at most ${definition.maximum}`);
  }
}

function validateArray(value, definition, path, root, errors) {
  if (definition.minItems !== undefined && value.length < definition.minItems) {
    errors.push(`${path} has too few items`);
  }
  if (definition.maxItems !== undefined && value.length > definition.maxItems) {
    errors.push(`${path} has too many items`);
  }
  if (definition.items) {
    value.forEach((item, index) =>
      visit(item, definition.items, `${path}[${index}]`, root, errors),
    );
  }
}

function validateObject(value, definition, path, root, errors) {
  for (const required of definition.required ?? []) {
    if (!Object.hasOwn(value, required))
      errors.push(`${path}.${required} is required`);
  }
  const properties = definition.properties ?? {};
  for (const [name, child] of Object.entries(value)) {
    if (properties[name])
      visit(child, properties[name], `${path}.${name}`, root, errors);
    else if (definition.additionalProperties === false)
      errors.push(`${path}.${name} is unknown`);
  }
}

function resolveReference(reference, root) {
  if (!reference.startsWith("#/")) {
    throw new Error(`Unsupported external schema reference: ${reference}`);
  }
  const resolved = reference
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], root);
  if (!resolved) throw new Error(`Unresolved schema reference: ${reference}`);
  return resolved;
}

function validateFragment(value, definition, root) {
  const errors = [];
  visit(value, definition, "$", root, errors);
  return errors;
}

function matchesType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "object") return isObject(value);
  return typeof value === type;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
