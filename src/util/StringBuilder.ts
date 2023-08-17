export class StringBuilder {
  value: string;
  /**
   * @param str string
   * @param bool whether or not to include this, conditional string building
   */
  add(str: string, bool: boolean = true) {
    if (bool) this.value += str;
    return this;
  }
  toString() {
    return this.value;
  }
}