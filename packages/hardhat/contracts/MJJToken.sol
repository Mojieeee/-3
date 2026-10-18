// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// 按实验 2 命名规则由本人提供的姓名首字母与完整学号生成。
contract MJJToken {
    // ---------- 元数据 ----------
    string public name = "MJJToken";
    string public symbol = "MJJ202430551184";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    // ---------- 权限 ----------
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "MJJToken: caller is not the owner");
        _;
    }

    // ---------- 状态 ----------
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ---------- 事件 ----------
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        owner = msg.sender;
    }

    // ---------- 只读查询 ----------
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address _owner, address spender) public view returns (uint256) {
        return _allowances[_owner][spender];
    }

    // ---------- 1：转账 ----------
    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0), "MJJToken: transfer to the zero address");
        require(_balances[msg.sender] >= value, "MJJToken: insufficient balance");
        // 顺序读写同一个 mapping，from == to 时余额保持不变。
        _balances[msg.sender] -= value;
        _balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    // ---------- 2：授权 ----------
    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "MJJToken: approve to the zero address");
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // ---------- 3：代扣转账 ----------
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(from != address(0), "MJJToken: transfer from the zero address");
        require(to != address(0), "MJJToken: transfer to the zero address");
        require(_balances[from] >= value, "MJJToken: insufficient balance");
        require(_allowances[from][msg.sender] >= value, "MJJToken: insufficient allowance");
        // 额度的第一维是资产所有人 from，第二维是实际调用者 msg.sender。
        _allowances[from][msg.sender] -= value;
        _balances[from] -= value;
        _balances[to] += value;
        emit Transfer(from, to, value);
        return true;
    }

    // ---------- 4：只有 owner 能增发 ----------
    function mint(address to, uint256 value) public onlyOwner {
        require(to != address(0), "MJJToken: mint to the zero address");
        totalSupply += value;
        _balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    // ---------- 5：只能销毁调用者自己的代币 ----------
    function burn(uint256 value) public {
        require(_balances[msg.sender] >= value, "MJJToken: insufficient balance");
        _balances[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
    }
}
