/*
 * Prim unit test suite.
 * Requires Node.
*/

var assert = require("assert"), _ = require("./vendor/underscore"), prim = require("../lib/prim");

// Ensures that Prim throws an exception when parsing the given JSON `source`
// string.
exports.parseError = function (source, message, callback) {
  assert.throws(function () {
    prim.parse(source, callback);
  }, /SyntaxError/, message);
};

// Ensures that Prim parses the given source string correctly.
exports.parses = function (expected, source, message, callback) {
  assert.ok(_.isEqual(expected, prim.parse(source, callback)), message);
};

// Ensures that Prim serializes the given object correctly.
exports.serializes = function (expected, value, message, filter, width) {
  assert.strictEqual(expected, prim.stringify(value, filter, width), message);
};

// Ensures that Prim throws a `TypeError` if the given object contains a
// circular reference.
exports.cyclicError = function (value, message) {
  assert.throws(function () {
    prim.stringify(value);
  }, function (exception) {
    return exception.name == "TypeError" && exception.message == "Cyclic structures cannot be serialized.";
  });
};

exports["Test Empty Source String"] = function () {
  exports.parseError("", "Empty JSON source string");
  exports.parseError("\n\n\r\n", "Source string containing only line terminators");
  exports.parseError(" ", "Source string containing a single space character");
  exports.parseError(" ", "Source string containing multiple space characters");
};

exports["Test Whitespace"] = function () {
  // The only valid JSON whitespace characters are tabs, spaces, and line
  // terminators. All other Unicode category `Z` (`Zs`, `Zl`, and `Zp`)
  // characters are invalid (note that the `Zs` category includes the
  // space character).
  ["{\u00a0}", "{\u1680}", "{\u180e}", "{\u2000}", "{\u2001}", "{\u2002}",
    "{\u2003}", "{\u2004}", "{\u2005}", "{\u2006}", "{\u2007}", "{\u2008}",
    "{\u2009}", "{\u200a}", "{\u202f}", "{\u205f}", "{\u3000}", "{\u2028}",
    "{\u2029}"].forEach(function (value) {
      exports.parseError(value, "Source string containing an invalid Unicode whitespace character");
  });

  exports.parseError("{\u000b}", "Source string containing a vertical tab");
  exports.parseError("{\u000c}", "Source string containing a form feed");
  exports.parseError("{\ufeff}", "Source string containing a byte-order mark");

  exports.parses({}, "{\r\n}", "Source string containing a CRLF line ending");
  exports.parses({}, "{\n\n\r\n}", "Source string containing multiple line terminators");
  exports.parses({}, "{\t}", "Source string containing a tab character");
  exports.parses({}, "{ }", "Source string containing a space character");
};

exports["Test Octal Values"] = function () {
  // `08` and `018` are invalid octal values.
  ["00", "01", "02", "03", "04", "05", "06", "07", "010", "011", "08", "018"].forEach(function (value) {
    exports.parseError(value, "Octal literal");
    exports.parseError("-" + value, "Negative octal literal");
    exports.parseError('"\\' + value + '"', "Octal escape sequence in a string");
    exports.parseError('"\\x' + value + '"', "Hex escape sequence in a string");
  });
};

exports["Test Numeric Literals"] = function () {
  exports.parses(100, "100", "Integer");
  exports.parses(-100, "-100", "Negative integer");
  exports.parses(10.5, "10.5", "Float");
  exports.parses(-3.141, "-3.141", "Negative float");
  exports.parses(0.625, "0.625", "Decimal");
  exports.parses(-0.03125, "-0.03125", "Negative decimal");
  exports.parses(1000, "1e3", "Exponential");
  exports.parses(100, "1e+2", "Positive exponential");
  exports.parses(-0.01, "-1e-2", "Negative exponential");
  exports.parses(3125, "0.03125e+5", "Decimalized exponential");
  exports.parses(100, "1E2", "Case-insensitive exponential delimiter");

  exports.parseError("+1", "Leading `+`");
  exports.parseError("1.", "Trailing decimal point");
  exports.parseError(".1", "Leading decimal point");
  exports.parseError("1e", "Missing exponent");
  exports.parseError("1e-", "Missing signed exponent");
  exports.parseError("--1", "Leading `--`");
  exports.parseError("1-+", "Trailing `-+`");
  exports.parseError("0xaf", "Hex literal");
  exports.parseError("- 5", "Invalid negative sign");
};

exports["Test String Literals"] = function () {
  exports.parses("value", '"value"', "Double-quoted string literal");
  exports.parses("", '""', "Empty string literal");

  exports.parses("\u2028", '"\\u2028"', "String containing an escaped Unicode line separator");
  exports.parses("\u2029", '"\\u2029"', "String containing an escaped Unicode paragraph separator");
  exports.parses("\ud834\udf06", '"\\ud834\\udf06"', "String containing an escaped Unicode surrogate pair");
  exports.parses("\ud834\udf06", '"\ud834\udf06"', "String containing an unescaped Unicode surrogate pair");
  exports.parses("\u0001", '"\\u0001"', "String containing an escaped ASCII control character");
  exports.parses("\b", '"\\b"', "String containing an escaped backspace");
  exports.parses("\f", '"\\f"', "String containing an escaped form feed");
  exports.parses("\n", '"\\n"', "String containing an escaped line feed");
  exports.parses("\r", '"\\r"', "String containing an escaped carriage return");
  exports.parses("\t", '"\\t"', "String containing an escaped tab");

  exports.parses("hello/world", '"hello\\/world"', "String containing an escaped solidus");
  exports.parses("hello\\world", '"hello\\\\world"', "String containing an escaped reverse solidus");
  exports.parses("hello\"world", '"hello\\"world"', "String containing an escaped double-quote character");

  exports.parseError("'hello'", "Single-quoted string literal");
  exports.parseError('"\\x61"', "String containing a hex escape sequence");
  exports.parseError('"hello \r\n world"', "String containing an unescaped CRLF line ending");
  ["\u0000", "\u0001", "\u0002", "\u0003", "\u0004", "\u0005", "\u0006",
    "\u0007", "\b", "\t", "\n", "\u000b", "\f", "\r", "\u000e", "\u000f",
    "\u0010", "\u0011", "\u0012", "\u0013", "\u0014", "\u0015", "\u0016",
    "\u0017", "\u0018", "\u0019", "\u001a", "\u001b", "\u001c", "\u001d",
    "\u001e", "\u001f"].forEach(function (value) {
      exports.parseError('"' + value + '"', "String containing an unescaped ASCII control character");
  });
};

exports["Test Array Literals"] = function () {
  exports.parseError("[1, 2, 3,]", "Trailing comma in array literal");
  exports.parses([1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]], "[1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]]", "Nested arrays");
  exports.parses([{}], "[{}]", "Array containing empty object literal");
  exports.parses([100, true, false, null, {"a": ["hello"], "b": ["world"]}, [0.01]], "[1e2, true, false, null, {\"a\": [\"hello\"], \"b\": [\"world\"]}, [1e-2]]", "Mixed array");
};

exports["Test Object Literals"] = function () {
  exports.parses({"hello": "world"}, "{\"hello\": \"world\"}", "Object literal containing one member");
  exports.parses({"hello": "world", "foo": ["bar", true], "fox": {"quick": true, "purple": false}}, "{\"hello\": \"world\", \"foo\": [\"bar\", true], \"fox\": {\"quick\": true, \"purple\": false}}", "Object literal containing multiple members");

  exports.parseError("{key: 1}", "Unquoted identifier used as a property name");
  exports.parseError("{false: 1}", "`false` used as a property name");
  exports.parseError("{true: 1}", "`true` used as a property name");
  exports.parseError("{null: 1}", "`null` used as a property name");
  exports.parseError("{'key': 1}", "Single-quoted string used as a property name");
  exports.parseError("{1: 2, 3: 4}", "Number used as a property name");

  exports.parseError("{\"hello\": \"world\", \"foo\": \"bar\",}", "Trailing comma in object literal");
};

// JavaScript expressions should never be evaluated, as Prim does not use
// `eval`.
exports["Test Invalid Expressions"] = function () {
  ["1 + 1", "1 * 2", "var value = 123;", "{});value = 123;({}", "call()", "1, 2, 3, \"value\""].forEach(function (expression) {
    exports.parseError(expression, "Source string containing a JavaScript expression");
  });
};

exports["Test Callback Function"] = function () {
  exports.parses({"a": 1, "b": 16}, '{"a": 1, "b": "10000"}', "Callback function provided", function (key, value) {
    return typeof value == "string" ? parseInt(value, 2) : value;
  });
};

exports["Test Serialization"] = function () {
  var value;

  exports.serializes("null", null, "`null` is represented literally");
  exports.serializes("null", 1 / 0, "`Infinity` is serialized as `null`");
  exports.serializes("null", 0 / 0, "`NaN` is serialized as `null`");
  exports.serializes("null", -1 / 0, "`-Infinity` is serialized as `null`");
  exports.serializes("true", true, "Boolean primitives are represented literally");
  exports.serializes("false", new Boolean(false), "Boolean objects are represented literally");
  exports.serializes('"\\\\\\"How\\bquickly\\tdaft\\njumping\\fzebras\\rvex\\""', new String('\\"How\bquickly\tdaft\njumping\fzebras\rvex"'), "All control characters in strings are escaped");

  exports.serializes("[false,1,\"Kit\"]", [new Boolean, new Number(1), new String("Kit")], "Arrays are serialized recursively");
  exports.serializes("{\"jdalton\":[\"John-David\",29],\"kitcambridge\":[\"Kit\",18],\"mathias\":[\"Mathias\",23]}", {
    "jdalton": ["John-David", 29],
    "kitcambridge": ["Kit", 18],
    "mathias": ["Mathias", 23]
  }, "Objects are serialized recursively");

  value = { "foo": { "b": { "foo": { "c": { "foo": null} } } } };
  exports.serializes('{"foo":{"b":{"foo":{"c":{"foo":null}}}}}', value, "Nested objects containing identically-named properties should serialize correctly");

  value.foo.b.foo.c.foo = value;
  exports.cyclicError(value, "Objects containing complex circular references should throw a `TypeError`");

  value = [];
  value[5] = 1;
  exports.serializes("[null,null,null,null,null,1]", value, "Sparse arrays should serialize correctly");

  value = new Date(1994, 6, 3);
  value.toJSON = null;
  exports.serializes('"1994-07-03T06:00:00.000Z"', value, "Dates are serialized using the simplified date time string format");

  value = new Date(1993, 5, 2, 2, 10, 28, 224);
  value.toJSON = null
  exports.serializes('"1993-06-02T08:10:28.224Z"', value, "The date time string should conform to the format outlined in the spec");

  value = new Date(-8.64e15);
  value.toJSON = null;
  exports.serializes('"-271821-04-20T00:00:00.000Z"', value, "The minimum valid date value should serialize correctly");

  value = new Date(8.64e15);
  value.toJSON = null;
  assert.equal(prim.stringify(value), '"+275760-09-13T00:00:00.000Z"', "The maximum valid date value should serialize correctly");

  exports.serializes("[\n  1,\n  2,\n  3,\n  [\n    4,\n    5\n  ]\n]", [1, 2, 3, [4, 5]], "Nested arrays; optional `whitespace` argument", null, "  ");
  exports.serializes("[]", [], "Empty array; optional string `whitespace` argument", null, "  ");
  exports.serializes("{}", {}, "Empty object; optional numeric `whitespace` argument", null, 2);
  exports.serializes("[\n  1\n]", [1], "Single-element array; optional numeric `whitespace` argument", null, 2);
  exports.serializes("{\n  \"foo\": 123\n}", { "foo": 123 }, "Single-member object; optional string `whitespace` argument", null, "  ");
  exports.serializes("{\n  \"foo\": {\n    \"bar\": [\n      123\n    ]\n  }\n}", {"foo": {"bar": [123]}}, "Nested objects; optional numeric `whitespace` argument", null, 2);
  exports.serializes("{\n  \"bar\": 456\n}", {"foo": 123, "bar": 456}, "Object; optional `filter` and `whitespace` arguments", ["bar"], 2);
};

/*
 * The following tests are adapted from the ECMAScript 5 Conformance Suite.
 * Copyright 2009, Microsoft Corporation. Distributed under the New BSD License.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   - Redistributions of source code must retain the above copyright notice,
 *     this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *   - Neither the name of Microsoft nor the names of its contributors may be
 *     used to endorse or promote products derived from this software without
 *     specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
*/
exports["Test ECMAScript 5 Conformance"] = function () {
  var value = { "a1": { "b1": [1, 2, 3, 4], "b2": { "c1": 1, "c2": 2 } }, "a2": "a2" };

  // Section 15.12.2: `JSON.parse()`.
  // --------------------------------

  // Test 15.12.2-0-1 and 15.12.2-0-2. 15.12.2-0-3 is inapplicable to ES 3.
  assert.equal("function", typeof prim.parse, "`Prim.parse` should be a function");
  assert.equal(2, prim.parse.length, "`Prim.parse` should accept two arguments");

  // Section 15.12.1.1: The JSON Grammar.
  // ------------------------------------

  // Tests 15.12.1.1-0-1 thru 15.12.1.1-0-8.
  exports.parseError("12\t\r\n 34", "Valid whitespace characters may not separate two discrete tokens");
  exports.parseError("\u000b1234", "The vertical tab is not a valid whitespace character");
  exports.parseError("\u000c1234", "The form feed is not a valid whitespace character");
  exports.parseError("\u00a01234", "The non-breaking space is not a valid whitespace character");
  exports.parseError("\u200b1234", "The zero-width space is not a valid whitespace character");
  exports.parseError("\ufeff1234", "The byte order mark (zero-width non-breaking space) is not a valid whitespace character");
  exports.parseError("\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u30001234", "Other Unicode category `Z` characters are not valid whitespace characters");
  exports.parseError("\u2028\u20291234", "The line (U+2028) and paragraph (U+2029) separators are not valid whitespace characters");

  // Test 15.12.1.1-0-9.
  exports.parses({ "property": {}, "prop2": [true, null, 123.456] },
    '\t\r \n{\t\r \n' +
    '"property"\t\r \n:\t\r \n{\t\r \n}\t\r \n,\t\r \n' +
    '"prop2"\t\r \n:\t\r \n' +
      '[\t\r \ntrue\t\r \n,\t\r \nnull\t\r \n,123.456\t\r \n]' +
    '\t\r \n}\t\r \n',
  "Valid whitespace characters may precede and follow all tokens");

  // Tests 15.12.1.1-g1-1 thru 15.12.1.1-g1-4.
  exports.parses(1234, "\t1234", "Leading tab characters should be ignored");
  exports.parseError("12\t34", "A tab character may not separate two disparate tokens");
  exports.parses(1234, "\r1234", "Leading carriage returns should be ignored");
  exports.parseError("12\r34", "A carriage return may not separate two disparate tokens");
  exports.parses(1234, "\n1234", "Leading line feeds should be ignored");
  exports.parseError("12\n34", "A line feed may not separate two disparate tokens");
  exports.parses(1234, " 1234", "Leading space characters should be ignored");
  exports.parseError("12 34", "A space character may not separate two disparate tokens");

  // Tests 15.12.1.1-g2-1 thru 15.12.1.1-g2-5.
  exports.parses("abc", '"abc"', "Strings must be enclosed in double quotes");
  exports.parseError("'abc'", "Single-quoted strings are not permitted");
  // Note: the original test 15.12.1.1-g2-3 (`"\u0022abc\u0022"`) is incorrect,
  // as the JavaScript interpreter will always convert `\u0022` to `"`.
  exports.parseError("\\u0022abc\\u0022", "Unicode-escaped double quote delimiters are not permitted");
  exports.parseError('"ab'+"c'", "Strings must terminate with a double quote character");
  exports.parses("", '""', "Strings may be empty");

  // Tests 15.12.1.1-g4-1 thru 15.12.1.1-g4-4.
  exports.parseError('"\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007"', "Unescaped control characters in the range [U+0000, U+0007] are not permitted within strings");
  exports.parseError('"\u0008\u0009\u000a\u000b\u000c\u000d\u000e\u000f"', "Unescaped control characters in the range [U+0008, U+000F] are not permitted within strings");
  exports.parseError('"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017"', "Unescaped control characters in the range [U+0010, U+0017] are not permitted within strings");
  exports.parseError('"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f"', "Unescaped control characters in the range [U+0018, U+001F] are not permitted within strings");

  // Tests 15.12.1.1-g5-1 thru 15.12.1.1-g5-3.
  exports.parses("X", '"\\u0058"', "Unicode escape sequences are permitted within strings");
  exports.parseError('"\\u005"', "Unicode escape sequences may not comprise fewer than four hexdigits");
  exports.parseError('"\\u0X50"', "Unicode escape sequences may not contain non-hex characters");

  // Tests 15.12.1.1-g6-1 thru 15.12.1.1-g6-7.
  exports.parses("/", '"\\/"', "Escaped solidus");
  exports.parses("\\", '"\\\\"', "Escaped reverse solidus");
  exports.parses("\b", '"\\b"', "Escaped backspace");
  exports.parses("\f", '"\\f"', "Escaped form feed");
  exports.parses("\n", '"\\n"', "Escaped line feed");
  exports.parses("\r", '"\\r"', "Escaped carriage return");
  exports.parses("\t", '"\\t"', "Escaped tab");

  // Section 15.12.3: `JSON.stringify()`.
  // ------------------------------------

  // Test 15.12.3-0-1 and 15.12.3-0-2. 15.12.3-0-3 is inapplicable.
  assert.equal("function", typeof prim.stringify, "`Prim.stringify` should be a function");
  assert.equal(3, prim.stringify.length, "`Prim.stringify` should accept three arguments");

  // Test 15.12.3-11-1 thru 5.12.3-11-15.
  exports.serializes(void 0, void 0, "`JSON.stringify(undefined)` should return `undefined`");
  exports.serializes('"replacement"', void 0, "The `JSON.stringify` callback function can be called on a top-level `undefined` value", function (key, value) {
    return "replacement";
  });
  exports.serializes('"a string"', "a string", "`JSON.stringify` should serialize top-level string primitives");
  exports.serializes("123", 123, "`JSON.stringify` should serialize top-level number primitives");
  exports.serializes("true", true, "`JSON.stringify` should serialize top-level Boolean primitives");
  exports.serializes("null", null, "`JSON.stringify` should serialize top-level `null` values");
  exports.serializes("42", new Number(42), "`JSON.stringify` should serialize top-level number objects");
  exports.serializes('"wrapped"', new String("wrapped"), "`JSON.stringify` should serialize top-level string objects");
  exports.serializes("false", new Boolean(false), "`JSON.stringify` should serialize top-level Boolean objects");
  exports.serializes(void 0, 42, "The `JSON.stringify` callback function may return `undefined` when called on a top-level number primitive", function () {
    return void 0;
  });
  exports.serializes(void 0, { "prop": 1 }, "The `JSON.stringify` callback function may return `undefined` when called on a top-level object", function () {
    return void 0;
  });
  exports.serializes("[4,2]", 42, "The `JSON.stringify` callback function may return an array when called on a top-level number primitive", function (key, value) {
    return value == 42 ? [4, 2] : value;
  });
  exports.serializes('{"forty":2}', 42, "The `JSON.stringify` callback function may return an object literal when called on a top-level number primitive", function (key, value) {
    return value == 42 ? { "forty": 2 } : value;
  });
  exports.serializes(void 0, function () {}, "`JSON.stringify` should return `undefined` when called on a top-level function");
  exports.serializes("99", function () {}, "The `JSON.stringify` callback function may return a number primitive when called on a top-level function", function () {
    return 99;
  });

  // Test 15.12.3-4-1.
  exports.serializes("[42]", [42], "`JSON.stringify` should ignore `filter` arguments that are not functions or arrays", {});

  // Test 15.12.3-5-a-i-1 and 15.12.3-5-b-i-1.
  assert.equal(prim.stringify(value, null, new Number(5)), prim.stringify(value, null, 5), "Optional `width` argument: Number object and primitive width values should produce identical results");
  assert.equal(prim.stringify(value, null, new String("xxx")), prim.stringify(value, null, "xxx"), "Optional `width` argument: String object and primitive width values should produce identical results");

  // Test 15.12.3-6-a-1 and 15.12.3-6-a-2.
  assert.equal(prim.stringify(value, null, 10), prim.stringify(value, null, 100), "Optional `width` argument: The maximum numeric width value should be 10");
  assert.equal(prim.stringify(value, null, 5.99999), prim.stringify(value, null, 5), "Optional `width` argument: Numeric values should be converted to integers");

  // Test 15.12.3-6-b-1 and 15.12.3-6-b-4.
  assert.equal(prim.stringify(value, null, 0.999999), prim.stringify(value), "Optional `width` argument: Numeric width values between 0 and 1 should be ignored");
  assert.equal(prim.stringify(value, null, 0), prim.stringify(value), "Optional `width` argument: Zero should be ignored");
  assert.equal(prim.stringify(value, null, -5), prim.stringify(value), "Optional `width` argument: Negative numeric values should be ignored");
  assert.equal(prim.stringify(value, null, 5), prim.stringify(value, null, "     "), "Optional `width` argument: Numeric width values in the range [1, 10] should produce identical results to that of string values containing `width` spaces");

  // Test 15.12.3-7-a-1.
  assert.equal(prim.stringify(value, null, "0123456789xxxxxxxxx"), prim.stringify(value, null, "0123456789"), "Optional `width` argument: String width values longer than 10 characters should be truncated");

  // Test 15.12.3-8-a-1 thru 15.12.3-8-a-5.
  assert.equal(prim.stringify(value, null, ""), prim.stringify(value), "Empty string `width` arguments should be ignored");
  assert.equal(prim.stringify(value, null, true), prim.stringify(value), "Boolean primitive `width` arguments should be ignored");
  assert.equal(prim.stringify(value, null, null), prim.stringify(value), "`null` `width` arguments should be ignored");
  assert.equal(prim.stringify(value, null, new Boolean(false)), prim.stringify(value), "Boolean object `width` arguments should be ignored");
  assert.equal(prim.stringify(value, null, value), prim.stringify(value), "Object literal `width` arguments should be ignored");

  // Test 15.12.3@2-2-b-i-1.
  exports.serializes('["fortytwo objects"]', [{
    "prop": 42,
    "toJSON": function () {
      return "fortytwo objects";
    }
  }], "An object literal with a custom `toJSON` method nested within an array may return a string primitive for serialization");

  // Test 15.12.3@2-2-b-i-2.
  exports.serializes('[42]', [{
    "prop": 42,
    "toJSON": function () {
      return new Number(42);
    }
  }], "An object literal with a custom `toJSON` method nested within an array may return a number object for serialization");

  // Test 15.12.3@2-2-b-i-3.
  exports.serializes('[true]', [{
    "prop": 42,
    "toJSON": function () {
      return new Boolean(true);
    }
  }], "An object liyeral with a custom `toJSON` method nested within an array may return a Boolean object for serialization");

  // Test 15.12.3@2-3-a-1.
  exports.serializes('["fortytwo"]', [42], "The `JSON.stringify` callback function may return a string object when called on an array", function (key, value) {
    return value === 42 ? new String("fortytwo") : value;
  });

  // Test 15.12.3@2-3-a-2.
  exports.serializes('[84]', [42], "The `JSON.stringify` callback function may return a number object when called on an array", function (key, value) {
    return value === 42 ? new Number(84) : value;
  });

  // Test 15.12.3@2-3-a-3.
  exports.serializes('[false]', [42], "The `JSON.stringify` callback function may return a Boolean object when called on an array", function (key, value) {
    return value === 42 ? new Boolean(false) : value;
  });

  // Test 15.12.3@4-1-2. 15.12.3@4-1-1 only tests whether an exception is
  // thrown; the type of the exception is not checked.
  value = {};
  value.prop = value;
  exports.cyclicError(value, "An object containing a circular reference should throw a `TypeError`");

  // Test 15.12.3@4-1-3, modified to ensure that a `TypeError` is thrown.
  value = { "p1": { "p2": {} } };
  value.p1.p2.prop = value;
  exports.cyclicError(value, "A nested cyclic structure should throw a `TypeError`");
};

// Run the unit tests.
if (module == require.main) {
  Object.keys(exports).forEach(function (value) {
    if (!value.lastIndexOf("Test", 0)) {
      console.log("Running test `%s`...", value);
      process.nextTick(exports[value]);
    }
  });
}