import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkCatalogues, messageArguments, readCatalogue } from "./catalogue";
import { DEFAULT_LOCALE, LOCALES } from "./config";
import en from "./messages/en/index";
import es from "./messages/es/index";

const messagesDir = path.join(__dirname, "messages");

describe("checkCatalogues", () => {
  const source = { ns: { a: "Hi {name}", b: "<b>Bold</b> {count, plural, one {# day} other {# days}}" } };

  it("accepts a matching catalogue", () => {
    expect(checkCatalogues(source, { es: { ns: { a: "Hola {name}", b: "<b>Negrita</b> {count, plural, one {# día} other {# días}}" } } })).toEqual([]);
  });

  it("reports missing, extra, unparsable and mismatched-argument messages", () => {
    const problems = checkCatalogues(source, { es: { ns: { a: "Hola {nombre}", c: "x", b: "{count, plural, one {# día}" } } });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ locale: "es", key: "ns.a", problem: "arguments" }),
        expect.objectContaining({ locale: "es", key: "ns.b", problem: "invalid" }),
        expect.objectContaining({ locale: "es", key: "ns.c", problem: "extra" }),
      ]),
    );
  });

  it("reports a namespace missing in a locale", () => {
    expect(checkCatalogues({ ns: { a: "A" }, other: { b: "B" } }, { es: { ns: { a: "A" } } })).toEqual([
      expect.objectContaining({ locale: "es", key: "other.b", problem: "missing" }),
    ]);
  });

  it("lists placeholder, plural and tag names", () => {
    expect(messageArguments("<terms>x</terms> {a} {n, plural, other {{b}}}")).toEqual(["a", "b", "n", "terms"]);
  });

  it("flags an apostrophe that swallows a placeholder", () => {
    expect(checkCatalogues({ ns: { a: "Type “{phrase}”" } }, { es: { ns: { a: "Escribe '{phrase}'" } } })).toEqual([
      expect.objectContaining({ key: "ns.a", problem: "arguments" }),
    ]);
  });
});

describe("the shipped catalogues", () => {
  it("have every key English has, and only those, in every locale", () => {
    const source = readCatalogue(path.join(messagesDir, DEFAULT_LOCALE));
    const others = Object.fromEntries(
      LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, readCatalogue(path.join(messagesDir, l))]),
    );
    expect(checkCatalogues(source, others)).toEqual([]);
  });

  it("import every namespace file in each locale barrel", () => {
    const files = (locale: string) =>
      fs.readdirSync(path.join(messagesDir, locale)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
    expect(Object.keys(en).sort()).toEqual(files("en"));
    expect(Object.keys(es).sort()).toEqual(files("es"));
  });
});
