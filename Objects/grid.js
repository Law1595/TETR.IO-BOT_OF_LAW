class Grid {
  constructor() {
    this.grid = [];
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let i = 0; i < 10; i++) {
      let column = [];
        for (let j = 0; j < 40; j++) {
          column.push(null);
        }
      this.grid.push(column);
    }
  }
}