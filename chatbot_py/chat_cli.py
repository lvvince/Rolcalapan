from app import reply

print("Mag-type ng tanong. 'exit' para lumabas.\n")
while True:
    q = input("Ikaw: ").strip()
    if q.lower() in ("exit", "quit", "q"):
        break
    if not q:
        continue
    answer, conf = reply(q)
    print(f"Bot [{conf:.2f}]: {answer}\n")