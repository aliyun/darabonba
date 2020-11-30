'use strict';

Error.stackTraceLimit = 100;
const path = require('path');
const assert = require('assert');

const Package = require('../lib/package');

describe('package', function () {
  it('no Darabonba should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/non_package'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.ok(ex.message.endsWith('is not a Darabonba package'));
      return;
    }
    assert.fail();
  });

  it('invalid darafile should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_invalid_darafile'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.ok(ex.message.startsWith('the darafile is invalid: '));
      return;
    }
    assert.fail();
  });

  it('non-darabonba 2.0 should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/clean_package'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.ok(ex.message.startsWith('the darabonba version(1.0) is not support by current parser'));
      return;
    }
    assert.fail();
  });

  it('empty package should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/empty_package'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.components, new Map());
    assert.deepStrictEqual(pkg.libraries, new Map());
    assert.deepStrictEqual(pkg.main, null);
  });

  it('package with model should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_model'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.libraries, new Map());
    assert.deepStrictEqual(pkg.main, null);
    assert.ok(pkg.components.get('M'));
    assert.deepStrictEqual(pkg.components.get('M').type, 'model');
  });

  it('package with duplicate model should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_duplicate_model'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.deepStrictEqual(ex.message, `redefined 'M'`);
      return;
    }
    assert.fail();
  });

  it('package with interface should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_interface'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.libraries, new Map());
    assert.deepStrictEqual(pkg.main, null);
    assert.ok(pkg.components.get('I'));
    assert.deepStrictEqual(pkg.components.get('I').type, 'interface');
  });

  it('package with module should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_module'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.libraries, new Map());
    assert.deepStrictEqual(pkg.main, null);
    assert.ok(pkg.components.get('Module'));
    assert.deepStrictEqual(pkg.components.get('Module').type, 'module');
  });

  it('package with duplicate module should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_duplicate_module'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.deepStrictEqual(ex.message, `redefined 'Module'`);
      return;
    }
    assert.fail();
  });

  it('package with dmain should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_dmain'));
    await pkg.analyse();
  });

  it('package with multi-dmain should not ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_multi_dmain'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.deepStrictEqual(ex.message, `dmain files can not more than one`);
      return;
    }
    assert.fail();
  });

  it('package with libraries should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_libraries'));
    try {
      await pkg.analyse();
    } catch (ex) {
      assert.ok(ex instanceof Error);
      assert.deepStrictEqual(ex.message, `the package(std) has not installed, use 'dara install' first`);
      return;
    }
    assert.fail();
  });

  it('package with libraries(installed) should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_libraries_installed'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.components, new Map());
    assert.deepStrictEqual(pkg.main, null);
    assert.ok(pkg.libraries.get('$std'));
  });

  it('package with libraries(local package) should ok', async function () {
    const pkg = new Package(path.join(__dirname, 'fixtures/package_with_libraries_local'));
    await pkg.analyse();
    assert.deepStrictEqual(pkg.components, new Map());
    assert.deepStrictEqual(pkg.main, null);
    assert.ok(pkg.libraries.get('$std'));
  });
});
