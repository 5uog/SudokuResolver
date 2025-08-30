# 数独を CSP として定式化

一般に CSP は三つ組 $ (V, D, C) $ で定義される。  
- $V$: 変数集合  
- $D$: 領域 (domain)  
- $C$: 制約集合

ブロック数式の例：
$$
\text{Sudoku} = \{ x \in D^{81} \mid \forall \text{row/col/box},\; \text{AllDifferent} \}
$$
