# P2P AI Token Marketplace

**Fully peer-to-peer AI model marketplace using Points (PTS) as native currency.**

## Points (PTS) Currency

The marketplace uses **Points (PTS)** as its native currency:
- 1 PTS = 1 `pricePer1k` unit
- When a buyer uses tokens, seller earns PTS automatically
- PTS can be spent instantly on any key in the marketplace
- Sellers can withdraw PTS for real money payouts

## How It Works

### 1. SELLER (List Your Key with Model Selection)
```json
POST /api/keys
{
  "provider": "deepseek",
  "modelName": "deepseek-chat",    // Select which model this key works for
  "apiKey": "sk-xxx",
  "pricePer1k": 1.0,                // 1 PTS earned per 1k tokens
  "maxTokens": 100000,
  "apiEndpoint": "https://api.deepseek.com/v1",
  "minPricePer1k": 0.5,             // OPTIONAL: Minimum PTS you'll accept
  "maxPricePer1k": 2.0              // OPTIONAL: Maximum PTS you'll accept
}
```

### 2. BUYER (Browse & Filter by Model)
```json
GET /api/keys?provider=deepseek&modelName=deepseek-chat
```

Buyer sees all keys for specific model with price bounds.

### 3. BUY TOKENS
```json
POST /api/keys/:id/buy
// Buyer pays from balance, gets escrow tokens
// Seller earns PTS instantly
```

### 4. EXECUTE (Use Tokens)
```json
POST /api/execute
{
  "purchaseId": "123",
  "messages": [{"role": "user", "content": "Hello"}],
  "maxTokens": 1000
}
```

### 5. SELLER WITHDRAW PTS
```json
POST /api/withdraw
{
  "amount": 500.00,    // Amount in PTS
  "walletAddress": "0x..."  // Destination wallet
}
```

## Model Price Bounds

Sellers can set minimum/maximum PTS they're willing to accept per 1k tokens:
- **minPricePer1k**: Lowest PTS price they'll accept
- **maxPricePer1k**: Highest PTS price they'll accept

When listing a key, system validates price is within bounds.

## Set Model Price Bounds
```json
POST /api/models/pricing
{
  "provider": "deepseek",
  "modelName": "deepseek-chat",
  "maxPricePer1k": 0.02,  // Buyer won't pay more than this
  "minPricePer1k": 0.005  // Seller needs at least this
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/auth/register` | Register | Email + password |
| `POST /api/auth/login` | Login | Returns JWT |
| `GET /api/balance` | Balance | Shows PTS credits + balance |
| `POST /api/deposit` | Deposit | Add funds to balance |
| `POST /api/withdraw` | Withdraw | Convert PTS to payout |
| `GET /api/keys` | Browse | Filter by provider/model |
| `GET /api/key` | My Keys | List my listed keys |
| `POST /api/keys` | Add Key | List new key with model |
| `POST /api/keys/:id/buy` | Buy | Purchase tokens |
| `POST /api/execute` | Execute | Call API |
| `GET /api/history` | History | Usage history |
| `POST /api/models/pricing` | Set Bounds | Price constraints |
| `GET /api/models/pricing` | Get Bounds | View bounds |

## Database Schema

```
users (id, email, name, wallet_address, credits, balance)
api_keys (id, seller_id, provider, model_name, price_per_1k, remaining_tokens)
model_pricing (provider, model_name, max_price_per_1k, min_price_per_1k)
token_purchases (buyer_id, key_id, tokens_remaining, credits_earned)
usage (buyer_id, purchase_id, provider, model_name, tokens, seller_credit)
withdrawals (user_id, amount, wallet_address, status)
```

## Currency Flow

```
Seller Lists Key (model + PTS price)
         ↓
Buyer Filters Keys by Model
         ↓
Buyer Buys Tokens → Seller earns PTS instantly
         ↓
Buyer Executes API → PTS auto-transferred to Seller
         ↓
PTS Available for Instant Redemption on Any Key
```