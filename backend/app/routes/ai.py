from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, Order
from collections import defaultdict

router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"]
)


def _build_context(products, orders) -> str:
    """Build inventory summary string to inject into AI prompt."""
    total_value  = sum(p.stock * p.price for p in products)
    low_stock    = [p for p in products if p.stock < (p.reorder_point or 10)]
    out_of_stock = [p for p in products if p.stock == 0]

    monthly = defaultdict(int)
    for o in orders:
        monthly[o.created_at.strftime("%b %Y")] += o.quantity
    recent = sorted(monthly.items())[-3:]

    ctx = f"""
Inventory Summary:
- Total SKUs: {len(products)}
- Total inventory value: ₹{total_value:,.2f}
- Out of stock: {len(out_of_stock)} products ({', '.join(p.name for p in out_of_stock) or 'none'})
- Low stock: {len(low_stock)} products ({', '.join(p.name for p in low_stock) or 'none'})
- Recent monthly sales: {', '.join(f'{m}: {q} units' for m, q in recent) or 'no data'}
- Categories: {', '.join(set(p.category for p in products))}
"""
    return ctx.strip()


def _rule_based_answer(question: str, products, orders) -> str | None:
    """Fast rule-based answers for common questions — no API call needed."""
    q = question.lower().strip()

    if any(w in q for w in ["hello", "hi", "hey"]):
        return "Hello! I am your AI Inventory Assistant. Ask me anything about your stock, orders, or products."

    if any(w in q for w in ["how many products", "total products", "product count"]):
        active = [p for p in products if p.is_active]
        return f"You have {len(active)} active products in inventory."

    if "low stock" in q or "running low" in q:
        low = [p for p in products if 0 < p.stock < (p.reorder_point or 10)]
        if not low:
            return "All products have sufficient stock."
        names = ", ".join(f"{p.name} ({p.stock} units)" for p in low)
        return f"{len(low)} products are running low: {names}"

    if "out of stock" in q:
        out = [p for p in products if p.stock == 0]
        if not out:
            return "No products are out of stock."
        return f"{len(out)} products are out of stock: {', '.join(p.name for p in out)}"

    if "inventory value" in q or "total value" in q:
        total = sum(p.stock * p.price for p in products)
        return f"Total inventory value is ₹{total:,.2f}"

    if "highest stock" in q or "most stock" in q:
        if products:
            p = max(products, key=lambda x: x.stock)
            return f"{p.name} has the highest stock with {p.stock} units."

    if "lowest stock" in q or "least stock" in q:
        active = [p for p in products if p.stock > 0]
        if active:
            p = min(active, key=lambda x: x.stock)
            return f"{p.name} has the lowest stock with {p.stock} units."

    if "total orders" in q or "how many orders" in q:
        return f"There are {len(orders)} total orders recorded."

    if "help" in q or "what can you do" in q:
        return (
            "You can ask me about:\n"
            "• Low stock / out of stock products\n"
            "• Total inventory value\n"
            "• Product counts and categories\n"
            "• Highest / lowest stock products\n"
            "• Order counts\n"
            "• Or any general inventory question"
        )

    return None  # no rule matched — fall through to AI


# ── Ask endpoint ───────────────────────────────────────────────────────────
@router.get("/ask")
def ask_ai(question: str, db: Session = Depends(get_db)):

    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    products = db.query(Product).filter(Product.is_active == True).all()
    orders   = db.query(Order).all()

    # try rule-based first (fast, no API cost)
    rule_answer = _rule_based_answer(question, products, orders)
    if rule_answer:
        return {"answer": rule_answer, "source": "rule"}

    # fallback: use inventory context for a meaningful response
    context = _build_context(products, orders)

    # ── Optional: uncomment to use Claude API ─────────────────────────────
    # import anthropic
    # client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    # message = client.messages.create(
    #     model="claude-opus-4-6",
    #     max_tokens=512,
    #     messages=[{
    #         "role": "user",
    #         "content": f"You are an inventory management AI assistant.\n\n{context}\n\nUser question: {question}"
    #     }]
    # )
    # return {"answer": message.content[0].text, "source": "claude"}
    # ─────────────────────────────────────────────────────────────────────

    return {
        "answer": f"Based on your inventory: {context}\n\nI couldn't find a specific answer to '{question}'. Try asking about low stock, inventory value, or product counts.",
        "source": "context"
    }


# ── Quick inventory health summary ────────────────────────────────────────
@router.get("/summary")
def get_ai_summary(db: Session = Depends(get_db)):

    products = db.query(Product).filter(Product.is_active == True).all()
    orders   = db.query(Order).all()

    out_of_stock = [p for p in products if p.stock == 0]
    low_stock    = [p for p in products if 0 < p.stock < (p.reorder_point or 10)]
    total_value  = sum(p.stock * p.price for p in products)

    alerts = []
    for p in out_of_stock:
        alerts.append({"type": "danger",  "product": p.name, "message": f"{p.name} is out of stock.", "action": "Reorder immediately"})
    for p in low_stock:
        alerts.append({"type": "warning", "product": p.name, "message": f"{p.name} has only {p.stock} units left.", "action": "Reorder soon"})

    return {
        "total_products":  len(products),
        "total_orders":    len(orders),
        "inventory_value": round(total_value, 2),
        "out_of_stock":    len(out_of_stock),
        "low_stock":       len(low_stock),
        "alerts":          alerts,
    }