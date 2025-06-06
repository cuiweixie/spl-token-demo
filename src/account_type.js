const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, AccountLayout, MintLayout } = require('@solana/spl-token');
const { struct, u8, u32, u64, blob } = require('@solana/buffer-layout');

class SolanaAccountAnalyzer {
    constructor(rpcUrl = 'http://127.0.0.1:8899') {
        this.connection = new Connection(rpcUrl);
    }
    
    async analyzeAccount(accountAddress) {
        const pubkey = new PublicKey(accountAddress);
        const accountInfo = await this.connection.getAccountInfo(pubkey);
        
        if (!accountInfo) {
            throw new Error('Account not found');
        }
        
        const analysis = {
            address: accountAddress,
            owner: accountInfo.owner.toBase58(),
            lamports: accountInfo.lamports,
            dataLength: accountInfo.data.length,
            executable: accountInfo.executable,
            rentEpoch: accountInfo.rentEpoch,
            type: 'Unknown',
            parsedData: null
        };
        
        // 尝试识别账户类型并解析
        if (this.isTokenAccount(accountInfo)) {
            analysis.type = 'Token Account';
            analysis.parsedData = this.parseTokenAccount(accountInfo.data);
        } else if (this.isTokenMint(accountInfo)) {
            analysis.type = 'Token Mint';
            analysis.parsedData = this.parseTokenMint(accountInfo.data);
        } else if (this.isSystemAccount(accountInfo)) {
            analysis.type = 'System Account';
        } else if (this.isProgramAccount(accountInfo)) {
            analysis.type = 'Program Account';
        } else {
            analysis.type = 'Custom Program Account';
            analysis.rawDataPreview = this.getRawDataPreview(accountInfo.data);
        }
        
        return analysis;
    }
    
    isTokenAccount(accountInfo) {
        return accountInfo.owner.equals(TOKEN_PROGRAM_ID) && 
               accountInfo.data.length === AccountLayout.span;
    }
    
    isTokenMint(accountInfo) {
        return accountInfo.owner.equals(TOKEN_PROGRAM_ID) && 
               accountInfo.data.length === MintLayout.span;
    }
    
    isSystemAccount(accountInfo) {
        return accountInfo.owner.equals(new PublicKey('11111111111111111111111111111111')) &&
               accountInfo.data.length === 0;
    }
    
    isProgramAccount(accountInfo) {
        return accountInfo.executable;
    }
    
    parseTokenAccount(data) {
        try {
            const decoded = AccountLayout.decode(data);
            return {
                mint: new PublicKey(decoded.mint).toBase58(),
                owner: new PublicKey(decoded.owner).toBase58(),
                amount: decoded.amount.toString(),
                delegate: decoded.delegateOption ? new PublicKey(decoded.delegate).toBase58() : null,
                delegatedAmount: decoded.delegateOption ? decoded.delegatedAmount.toString() : '0',
                state: this.getAccountState(decoded.state),
                isNative: decoded.isNativeOption ? decoded.isNative.toString() : null,
                closeAuthority: decoded.closeAuthorityOption ? new PublicKey(decoded.closeAuthority).toBase58() : null
            };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    parseTokenMint(data) {
        try {
            const decoded = MintLayout.decode(data);
            return {
                mintAuthorityOption: decoded.mintAuthorityOption,
                mintAuthority: decoded.mintAuthorityOption ? new PublicKey(decoded.mintAuthority).toBase58() : null,
                supply: decoded.supply.toString(),
                decimals: decoded.decimals,
                isInitialized: decoded.isInitialized,
                freezeAuthorityOption: decoded.freezeAuthorityOption,
                freezeAuthority: decoded.freezeAuthorityOption ? new PublicKey(decoded.freezeAuthority).toBase58() : null
            };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    getRawDataPreview(data) {
        const preview = data.slice(0, Math.min(128, data.length));
        return {
            hex: preview.toString('hex'),
            base64: preview.toString('base64'),
            length: data.length,
            // 尝试查找可能的公钥 (32字节)
            possiblePubkeys: this.extractPossiblePubkeys(data)
        };
    }
    
    extractPossiblePubkeys(data) {
        const pubkeys = [];
        for (let i = 0; i <= data.length - 32; i += 32) {
            try {
                const slice = data.slice(i, i + 32);
                const pubkey = new PublicKey(slice).toBase58();
                pubkeys.push({
                    offset: i,
                    pubkey: pubkey
                });
            } catch (e) {
                // 不是有效的公钥，跳过
            }
        }
        return pubkeys;
    }
    
    getAccountState(state) {
        switch (state) {
            case 0: return 'Uninitialized';
            case 1: return 'Initialized';
            case 2: return 'Frozen';
            default: return `Unknown (${state})`;
        }
    }
}

// 使用示例
async function main() {
    const analyzer = new SolanaAccountAnalyzer();
    
    try {
        const analysis = await analyzer.analyzeAccount('H6N8kL1jE7JJVkzSmkHwgqspQLLnDHXc8HSX6catWakp');
        console.log(JSON.stringify(analysis, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();

