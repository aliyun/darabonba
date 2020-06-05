import Assert;

init();

function testEqual(): void {
  Assert.staticEqual("A", "A", "");
  Assert.arrayEqual(["A"], ["A"], "");
}
