// spl-token-demo.js
const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');

const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  createAccount,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');

class SPLTokenDemo {
  constructor() {
    // 连接到本地测试网络
    this.connection = new Connection('http://localhost:8899', 'confirmed');
    
    // 创建或加载钱包
    this.payer = Keypair.generate(); // 在实际应用中，你可能想要加载现有的密钥对
    
    console.log('钱包地址:', this.payer.publicKey.toString());
  }

  // 初始化：空投 SOL 用于支付交易费用
  async initialize() {
    console.log('\n=== 初始化钱包 ===');
    
    try {
      // 空投 10 SOL
      const signature = await this.connection.requestAirdrop(
        this.payer.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      
      await this.connection.confirmTransaction(signature);
      
      const balance = await this.connection.getBalance(this.payer.publicKey);
      console.log(`SOL 余额: ${balance / LAMPORTS_PER_SOL} SOL`);
      
    } catch (error) {
      console.error('初始化失败:', error);
      throw error;
    }
  }

  // 1. 创建新的 SPL Token
  async createToken() {
    console.log('\n=== 1. 创建 SPL Token ===');
    
    try {
      // 创建新的 mint
      this.mint = await createMint(
        this.connection,
        this.payer,           // 支付账户
        this.payer.publicKey, // mint authority
        this.payer.publicKey, // freeze authority
        9                     // decimals
      );
      
      console.log('Token 地址:', this.mint.toString());
      return this.mint;
      
    } catch (error) {
      console.error('创建 Token 失败:', error);
      throw error;
    }
  }

  // 2. 创建 Regular Token Account
  async createRegularTokenAccount() {
    console.log('\n=== 2. 创建 Regular Token Account ===');
    
    try {
      this.regularTokenAccount = await createAccount(
        this.connection,
        this.payer,           // 支付账户
        this.mint,            // token mint
        this.payer.publicKey  // owner
      );
      
      console.log('Regular Token Account:', this.regularTokenAccount.toString());
      return this.regularTokenAccount;
      
    } catch (error) {
      console.error('创建 Regular Token Account 失败:', error);
      throw error;
    }
  }

  // 3. 往 Regular Token Account 铸造代币
  async mintToRegularAccount(amount) {
    console.log(`\n=== 3. 铸造 ${amount} 代币到 Regular Token Account ===`);
    
    try {
      const signature = await mintTo(
        this.connection,
        this.payer,                    // 支付账户
        this.mint,                     // token mint
        this.regularTokenAccount,      // 目标账户
        this.payer.publicKey,          // mint authority
        amount * Math.pow(10, 9)       // 考虑 decimals
      );
      
      console.log('铸造交易签名:', signature);
      return signature;
      
    } catch (error) {
      console.error('铸造代币失败:', error);
      throw error;
    }
  }

  // 4. 查看 Regular Token Account 余额
  async getRegularAccountBalance() {
    console.log('\n=== 4. 查看 Regular Token Account 余额 ===');
    
    try {
      const accountInfo = await getAccount(
        this.connection,
        this.regularTokenAccount
      );
      
      const balance = Number(accountInfo.amount) / Math.pow(10, 9);
      console.log(`Regular Token Account 余额: ${balance} tokens`);
      
      return balance;
      
    } catch (error) {
      console.error('查看余额失败:', error);
      throw error;
    }
  }

  // 5. 创建 Associated Token Account
  async createAssociatedTokenAccount() {
    console.log('\n=== 5. 创建 Associated Token Account ===');
    
    try {
      this.associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payer,           // 支付账户
        this.mint,            // token mint
        this.payer.publicKey  // owner
      );
      
      console.log('Associated Token Account:', this.associatedTokenAccount.address.toString());
      return this.associatedTokenAccount.address;
      
    } catch (error) {
      console.error('创建 Associated Token Account 失败:', error);
      throw error;
    }
  }

  // 6. 往 Associated Token Account 铸造代币
  async mintToAssociatedAccount(amount) {
    console.log(`\n=== 6. 铸造 ${amount} 代币到 Associated Token Account ===`);
    
    try {
      const signature = await mintTo(
        this.connection,
        this.payer,                           // 支付账户
        this.mint,                            // token mint
        this.associatedTokenAccount.address,  // 目标账户
        this.payer.publicKey,                 // mint authority
        amount * Math.pow(10, 9)              // 考虑 decimals
      );
      
      console.log('铸造交易签名:', signature);
      return signature;
      
    } catch (error) {
      console.error('铸造代币失败:', error);
      throw error;
    }
  }

  // 7. 查看 Associated Token Account 余额
  async getAssociatedAccountBalance() {
    console.log('\n=== 7. 查看 Associated Token Account 余额 ===');
    
    try {
      const accountInfo = await getAccount(
        this.connection,
        this.associatedTokenAccount.address
      );
      
      const balance = Number(accountInfo.amount) / Math.pow(10, 9);
      console.log(`Associated Token Account 余额: ${balance} tokens`);
      
      return balance;
      
    } catch (error) {
      console.error('查看余额失败:', error);
      throw error;
    }
  }

  // 8. 从 Regular Token Account 转账到 Associated Token Account
  async transferTokens(amount) {
    console.log(`\n=== 8. 转账 ${amount} 代币从 Regular 到 Associated Account ===`);
    
    try {
      const signature = await transfer(
        this.connection,
        this.payer,                           // 支付账户
        this.regularTokenAccount,             // 源账户
        this.associatedTokenAccount.address,  // 目标账户
        this.payer.publicKey,                 // owner
        amount * Math.pow(10, 9)              // 考虑 decimals
      );
      
      console.log('转账交易签名:', signature);
      return signature;
      
    } catch (error) {
      console.error('转账失败:', error);
      throw error;
    }
  }

  // 9. 查看两个账户的最终余额
  async getFinalBalances() {
    console.log('\n=== 9. 查看最终余额 ===');
    
    try {
      // 查看 Regular Token Account 余额
      const regularAccountInfo = await getAccount(
        this.connection,
        this.regularTokenAccount
      );
      const regularBalance = Number(regularAccountInfo.amount) / Math.pow(10, 9);
      
      // 查看 Associated Token Account 余额
      const associatedAccountInfo = await getAccount(
        this.connection,
        this.associatedTokenAccount.address
      );
      const associatedBalance = Number(associatedAccountInfo.amount) / Math.pow(10, 9);
      
      console.log(`Regular Token Account 余额: ${regularBalance} tokens`);
      console.log(`Associated Token Account 余额: ${associatedBalance} tokens`);
      
      return {
        regular: regularBalance,
        associated: associatedBalance
      };
      
    } catch (error) {
      console.error('查看最终余额失败:', error);
      throw error;
    }
  }

  // 显示操作总结
  async showSummary() {
    console.log('\n=== 操作总结 ===');
    console.log('钱包地址:', this.payer.publicKey.toString());
    console.log('Token 地址:', this.mint.toString());
    console.log('Regular Token Account:', this.regularTokenAccount.toString());
    console.log('Associated Token Account:', this.associatedTokenAccount.address.toString());
    
    const balances = await this.getFinalBalances();
    console.log('\n余额分布:');
    console.log(`  Regular Account: ${balances.regular} tokens`);
    console.log(`  Associated Account: ${balances.associated} tokens`);
    console.log(`  总计: ${balances.regular + balances.associated} tokens`);
  }

  // 执行完整的演示流程
  async runDemo() {
    try {
      await this.initialize();
      await this.createToken();
      await this.createRegularTokenAccount();
      await this.mintToRegularAccount(1000);
      await this.getRegularAccountBalance();
      await this.createAssociatedTokenAccount();
      await this.mintToAssociatedAccount(500);
      await this.getAssociatedAccountBalance();
      await this.transferTokens(200);
      await this.showSummary();
      
      console.log('\n✅ 所有操作完成！');
      
    } catch (error) {
      console.error('演示过程中出现错误:', error);
    }
  }
}

// 运行演示
async function main() {
  const demo = new SPLTokenDemo();
  await demo.runDemo();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SPLTokenDemo;

