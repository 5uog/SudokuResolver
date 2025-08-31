# SudokuResolver



## 要旨
> 本稿は、数独解読を **有限領域制約充足問題 (CSP)** として位置づけ、その理論的基盤から実装設計・可視化アプリケーションに至るまでを統合的に論じる。全体は第1節から第12節で構成され、数理的定式化、推論規則、探索手法、実装効率、難易度計量、問題生成、GUI、Core API、DLXアルゴリズム、複雑性分析、テスト規律、そして総括に至る流れを示す。まず (第1節) において CSP としての定義と一意解性の条件を導入し、(第2節) では候補削減や部分盤面推論を縮約作用素の不動点として形式化する。推論のみでは不十分な場合に対しては (第3節) 限定的探索を導入し、MRV や Degree ヒューリスティクスによる効率化を論じる。実装面では (第4節) ビットマスクによる高速な候補管理を示し、(第5節) 各規則や探索に原価を割り当てることで難易度を定量化する。問題生成については (第6節) 完全盤からの削除による逆問題設定を提示し、(第9節) で DLX アルゴリズムを用いた厳密な一意性判定を扱う。さらに (第7節) GUI による可視化、(第8節) Core API によるモジュール化を述べる。最後に (第10節) 探索木の複雑性分析と剪定戦略、(第11節) テスト規律を整理し、(第12節) として数独解読研究の展望を示す。以上により、本稿は「数独」というパズルを超えて、制約充足問題における推論・探索・可視化を統合的に設計する一例を与える。



## 目次
- [1. 数独の数理的定式化：制約充足問題としての構造と一意解性](#1-csp-formulation)
- [2. 推論規則の設計](#2-推論規則の設計)
- [3. 限定的探索](#3-limited-search)
- [4. データ構造と演算効率](#4-データ構造と演算効率)
- [5. 難易度の計量学](#5-難易度の計量学)
- [6. 問題生成と一意性保証](#6-問題生成と一意性保証)
- [7. GUI と可視化](#7-gui-と可視化)
- [8. Core API の設計](#8-core-api-の設計)
- [9. 生成アルゴリズム（DLX）](#9-生成アルゴリズムdlx)
- [10. 複雑性の分析と最適化](#10-複雑性の分析と最適化)
- [11. テスト規律](#11-テスト規律)
- [12. まとめ](#12-まとめ)



<h2 id="1-csp-formulation">1. 数独の数理的定式化：
<ruby>制約充足問題<rt>せいやくじゅうそくもんだい</rt></ruby>としての構造と
<ruby>一意解性<rt>いちいかいせい</rt></ruby></h2>

数独は単純なパズルとして大衆的に親しまれているが、数学的に捉えるならば有限領域制約充足問題（Constraint Satisfaction Problem, CSP）の代表例として位置づけられる。この視点に立つと、数独は単なる娯楽にとどまらず、計算複雑性理論、抽象代数学、情報理論、さらには実用的なアルゴリズム設計に至るまで多岐にわたる学術的意義を持つことが明らかになる。有限 CSP は厳密には三つ組 <picture><img src="https://latex.codecogs.com/svg.latex?\bg_white (V,\{D_v\}_{v\in V},C)"></picture> によって与えられる。ここで <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DV"><img alt="V" src="https://latex.codecogs.com/svg.latex?V"></picture> は有限の変数集合であり、各 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dv%5Cin%20V"><img alt="v\in V" src="https://latex.codecogs.com/svg.latex?v%5Cin%20V"></picture> には有限集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DD_v"><img alt="D_v" src="https://latex.codecogs.com/svg.latex?D_v"></picture> が値域として割り当てられる。<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DC"><img alt="C" src="https://latex.codecogs.com/svg.latex?C"></picture> は制約の族であり、各制約 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dc%5Cin%20C"><img alt="c\in C" src="https://latex.codecogs.com/svg.latex?c%5Cin%20C"></picture> はスコープ <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7Bscope%7D(c)=(v_1,%5Cdots,v_k)"><img alt="\mathrm{scope}(c)=(v_1,\dots,v_k)" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7Bscope%7D(c)=(v_1,%5Cdots,v_k)"></picture> とその関係 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DR_c%5Csubseteq%20%5Cprod_%7Bi=1%7D%5Ek%20D_%7Bv_i%7D"><img alt="R_c\subseteq \prod_{i=1}^k D_{v_i}" src="https://latex.codecogs.com/svg.latex?R_c%5Csubseteq%20%5Cprod_%7Bi=1%7D%5Ek%20D_%7Bv_i%7D"></picture></p> 

との組で記述される。解とは写像 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Csigma:V%5Cto%20%5Cbigsqcup_%7Bv%7D%20D_v"><img alt="\sigma:V\to \bigsqcup_{v} D_v" src="https://latex.codecogs.com/svg.latex?%5Csigma:V%5Cto%20%5Cbigsqcup_%7Bv%7D%20D_v"></picture></p> 

であって、任意の <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dc%5Cin%20C"><img alt="c\in C" src="https://latex.codecogs.com/svg.latex?c%5Cin%20C"></picture> に対して <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(%5Csigma(v_1),%5Cdots,%5Csigma(v_k))%5Cin%20R_c"><img alt="(\sigma(v_1),\dots,\sigma(v_k))\in R_c" src="https://latex.codecogs.com/svg.latex?(%5Csigma(v_1),%5Cdots,%5Csigma(v_k))%5Cin%20R_c"></picture> を満たすものである。一般形では各変数ごとに領域 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DD_v%20=%20D"><img alt="D_v = D" src="https://latex.codecogs.com/svg.latex?D_v%20=%20D"></picture> が与えられるが、数独の場合は全変数に共通して <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DD_v"><img alt="D_v" src="https://latex.codecogs.com/svg.latex?D_v"></picture> を採用する。

数独の具体化においては、変数集合を <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DV=%5C%7Bx_%7Br,c%7D%5Cmid%20r,c%5Cin%5C%7B1,%5Cdots,9%5C%7D%5C%7D"><img alt="V=\{x_{r,c}\mid r,c\in\{1,\dots,9\}\}" src="https://latex.codecogs.com/svg.latex?V=%5C%7Bx_%7Br,c%7D%5Cmid%20r,c%5Cin%5C%7B1,%5Cdots,9%5C%7D%5C%7D"></picture> と定め、各変数の値域は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DD=%5C%7B1,%5Cdots,9%5C%7D"><img alt="D=\{1,\dots,9\}" src="https://latex.codecogs.com/svg.latex?D=%5C%7B1,%5Cdots,9%5C%7D"></picture> とする。制約族は行・列・各 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D3%5Ctimes%203"><img alt="3\times 3" src="https://latex.codecogs.com/svg.latex?3%5Ctimes%203"></picture> ブロックごとに all-different 制約を課すことで表される。すなわち 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7BAllDiff%7D(v_1,%5Cdots,v_9)=%5C%7B(d_1,%5Cdots,d_9)%5Cin%20D%5E9%20%5Cmid%20%5Cforall%20i%5Cneq%20j,%5C%20d_i%5Cneq%20d_j%5C%7D"><img alt="\mathrm{AllDiff}(v_1,\dots,v_9)=\{(d_1,\dots,d_9)\in D^9 \mid \forall i\neq j,\ d_i\neq d_j\}" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7BAllDiff%7D(v_1,%5Cdots,v_9)=%5C%7B(d_1,%5Cdots,d_9)%5Cin%20D%5E9%20%5Cmid%20%5Cforall%20i%5Cneq%20j,%5C%20d_i%5Cneq%20d_j%5C%7D"></picture></p> 

を定義し、これを 27 系（9 行・9 列・9 ブロック）に適用する。与え値は単項制約 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dx_%7Br,c%7D=d"><img alt="x_{r,c}=d" src="https://latex.codecogs.com/svg.latex?x_%7Br,c%7D=d"></picture> として追加され、全体の問題は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DP=(V,D,C%5Ccup%20G)"><img alt="P=(V,D,C\cup G)" src="https://latex.codecogs.com/svg.latex?P=(V,D,C%5Ccup%20G)"></picture> と表される。充足可能性は 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathsf%7BSAT%7D(P):=%5Cexists%20%5Csigma:V%5Cto%20D%5C%20%5Cforall%20c%5Cin%20C%5Ccup%20G,%5C%20%5Csigma%5Cmodels%20c"><img alt="\mathsf{SAT}(P):=\exists \sigma:V\to D\ \forall c\in C\cup G,\ \sigma\models c" src="https://latex.codecogs.com/svg.latex?%5Cmathsf%7BSAT%7D(P):=%5Cexists%20%5Csigma:V%5Cto%20D%5C%20%5Cforall%20c%5Cin%20C%5Ccup%20G,%5C%20%5Csigma%5Cmodels%20c"></picture></p> 

により定義される。ここで <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Csigma%20%5Cmodels%20c"><img alt="\sigma \models c" src="https://latex.codecogs.com/svg.latex?%5Csigma%20%5Cmodels%20c"></picture> とは、<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dc"><img alt="c" src="https://latex.codecogs.com/svg.latex?c"></picture> のスコープ上への <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Csigma"><img alt="\sigma" src="https://latex.codecogs.com/svg.latex?%5Csigma"></picture> の制限が関係 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DR_c"><img alt="R_c" src="https://latex.codecogs.com/svg.latex?R_c"></picture> に属することを意味する。

また、一意性は 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathsf%7BUNQ%7D(P):=(%5Cexists%20%5Csigma%5C%20%5Ctext%7Bsolution%7D)%5C%20%5Cwedge%5C%20%5Cneg(%5Cexists%20%5Csigma_1%5Cneq%20%5Csigma_2%5C%20%5Ctext%7Bsolution%7D)"><img alt="\mathsf{UNQ}(P):=(\exists \sigma\ \text{solution})\ \wedge\ \neg(\exists \sigma_1\neq \sigma_2\ \text{solution})" src="https://latex.codecogs.com/svg.latex?%5Cmathsf%7BUNQ%7D(P):=(%5Cexists%20%5Csigma%5C%20%5Ctext%7Bsolution%7D)%5C%20%5Cwedge%5C%20%5Cneg(%5Cexists%20%5Csigma_1%5Cneq%20%5Csigma_2%5C%20%5Ctext%7Bsolution%7D)"></picture></p> 

として表される。前者は NP に属し、後者は「異なる二つの解の存在」が NP であるためその否定は coNP に属する。従って <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathsf%7BUNQ%7D(P)%5Cin%5Cmathrm%7BDP%7D"><img alt="\mathsf{UNQ}(P)\in\mathrm{DP}" src="https://latex.codecogs.com/svg.latex?%5Cmathsf%7BUNQ%7D(P)%5Cin%5Cmathrm%7BDP%7D"></picture> に属する。一般化された数独では DP 完全性が知られているが、ここでは帰属の説明にとどめる。DP クラスは <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5C%7BL_1%5Cwedge%20L_2%5Cmid%20L_1%5Cin%5Cmathrm%7BNP%7D,L_2%5Cin%5Cmathrm%7BcoNP%7D%5C%7D"><img alt="\{L_1\wedge L_2\mid L_1\in\mathrm{NP},L_2\in\mathrm{coNP}\}" src="https://latex.codecogs.com/svg.latex?%5C%7BL_1%5Cwedge%20L_2%5Cmid%20L_1%5Cin%5Cmathrm%7BNP%7D,L_2%5Cin%5Cmathrm%7BcoNP%7D%5C%7D"></picture> として与えられる自然な複雑性クラスであり、数独の一意性判定が存在と非存在の二重量化を含むという事実を正確に捉える。ここで留意すべきは、<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathsf%7BUNQ%7D(P)"><img alt="\mathsf{UNQ}(P)" src="https://latex.codecogs.com/svg.latex?%5Cmathsf%7BUNQ%7D(P)"></picture> の帰属は言語としての帰属であり、特定の実装戦略（例えば探索の順序選択）に依存しないことである。この形式論に直ちに付随するのは、候補集合の数学的構造である。各セル <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(r,c)"><img alt="(r,c)" src="https://latex.codecogs.com/svg.latex?(r,c)"></picture> に候補集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DS_%7Br,c%7D%5Csubseteq%20D"><img alt="S_{r,c}\subseteq D" src="https://latex.codecogs.com/svg.latex?S_%7Br,c%7D%5Csubseteq%20D"></picture> を割り当てると、その直積 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathcal%20L=%5Cmathcal%20P(D)%5EV"><img alt="\mathcal L=\mathcal P(D)^V" src="https://latex.codecogs.com/svg.latex?%5Cmathcal%20L=%5Cmathcal%20P(D)%5EV"></picture> は包含順序 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cpreceq"><img alt="\preceq" src="https://latex.codecogs.com/svg.latex?%5Cpreceq"></picture> の下で有限完備束をなす。all-different 制約および与え値から導かれる候補削減作用素 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DF:%5Cmathcal%20L%5Cto%5Cmathcal%20L"><img alt="F:\mathcal L\to\mathcal L" src="https://latex.codecogs.com/svg.latex?F:%5Cmathcal%20L%5Cto%5Cmathcal%20L"></picture> を、各座標に関して単調かつ縮約（すなわち <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DX%5Cpreceq%20Y%20%5CRightarrow%20F(X)%5Cpreceq%20F(Y)"><img alt="X\preceq Y \Rightarrow F(X)\preceq F(Y)" src="https://latex.codecogs.com/svg.latex?X%5Cpreceq%20Y%20%5CRightarrow%20F(X)%5Cpreceq%20F(Y)"></picture> かつ <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DF(X)%5Cpreceq%20X"><img alt="F(X)\preceq X" src="https://latex.codecogs.com/svg.latex?F(X)%5Cpreceq%20X"></picture>）となるよう構成する。Knaster–Tarski の定理により、完備束上の単調写像は最小不動点 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Coperatorname%7Blfp%7D(F)"><img alt="\operatorname{lfp}(F)" src="https://latex.codecogs.com/svg.latex?%5Coperatorname%7Blfp%7D(F)"></picture> を持ち、さらに有限性ゆえ降鎖条件が成立するので Kleene 反復 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DX_0=%5Ctop,%5Cquad%20X_%7Bi+1%7D=F(X_i)"><img alt="X_0=\top,\quad X_{i+1}=F(X_i)" src="https://latex.codecogs.com/svg.latex?X_0=%5Ctop,%5Cquad%20X_%7Bi+1%7D=F(X_i)"></picture></p> 

は有限段で安定し <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cexists%20N:%5C%20X_N=X_%7BN+1%7D=%5Coperatorname%7Blfp%7D(F)"><img alt="\exists N:\ X_N=X_{N+1}=\operatorname{lfp}(F)" src="https://latex.codecogs.com/svg.latex?%5Cexists%20N:%5C%20X_N=X_%7BN+1%7D=%5Coperatorname%7Blfp%7D(F)"></picture> を満たす。この収束性は実装形態に依存せず、非同期反復（chaotic iteration）をワークリスト方式を用いた場合でも、作用素が単調かつ格子が有限であるため、必ず最小不動点に到達する。これは言うまでもない。実際の実装では、更新が生じたセルの近傍三系（同じ行・列・ブロック）をワークリストに再投入することで、この下降列を効率的に計算できる。数独の制約グラフでは各セルが約20の近傍をもち、全体の辺数は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7De%20%5Capprox%20810"><img alt="e \approx 810" src="https://latex.codecogs.com/svg.latex?e%20%5Capprox%20810"></picture> 程度にすぎない。したがって <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd=9"><img alt="d=9" src="https://latex.codecogs.com/svg.latex?d=9"></picture> が定数であることを考慮すれば、更新操作のコストは実務的には「更新回数×定数」に収束するとみなせる。

弧整合（AC-3, AC-2001）や一般化整合（GAC）は、関係の射影・前像に基づく具体的な <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DF"><img alt="F" src="https://latex.codecogs.com/svg.latex?F"></picture> の実現であり、その健全性は「削除される候補は現行の制約下で支持の無い値のみ」という性質により保証され、完全性は「<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Coperatorname%7Blfp%7D(F)"><img alt="\operatorname{lfp}(F)" src="https://latex.codecogs.com/svg.latex?%5Coperatorname%7Blfp%7D(F)"></picture> 到達後は、局所的な意味でこれ以上削減できない」こととして特徴づけられる。計算量の見積もりにおいて、AC-3 はエッジ数 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7De"><img alt="e" src="https://latex.codecogs.com/svg.latex?e"></picture>、領域サイズ <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd=%7CD%7C"><img alt="d=|D|" src="https://latex.codecogs.com/svg.latex?d=%7CD%7C"></picture> に対し <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DO(ed%5E3)"><img alt="O(ed^3)" src="https://latex.codecogs.com/svg.latex?O(ed%5E3)"></picture>、改良型の AC-2001 は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DO(ed%5E2)"><img alt="O(ed^2)" src="https://latex.codecogs.com/svg.latex?O(ed%5E2)"></picture> の振る舞いを示すと解析されるが、数独では <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd=9"><img alt="d=9" src="https://latex.codecogs.com/svg.latex?d=9"></picture> が定数であるため、実務上はセル数 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D81"><img alt="81" src="https://latex.codecogs.com/svg.latex?81"></picture> と制約の疎密構造が支配的となる。さらに all-different に対してはマッチング理論に基づく強整合化（Regin のアルゴリズム）により、集合被覆の観点から候補削除が可能であるが、これも作用素 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DF"><img alt="F" src="https://latex.codecogs.com/svg.latex?F"></picture> の特殊化として理解できる。

候補格子の縮約を定量化するために情報理論的尺度を導入する。独立一様近似の下で各セルに対し 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DH(x_%7Br,c%7D)=%5Clog%20%7CS_%7Br,c%7D%7C"><img alt="H(x_{r,c})=\log |S_{r,c}|" src="https://latex.codecogs.com/svg.latex?H(x_%7Br,c%7D)=%5Clog%20%7CS_%7Br,c%7D%7C"></picture></p> 

を定義し、盤面の不確実性を 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DH(P)=%5Csum_%7Br,c%7D%20%5Clog%20%7CS_%7Br,c%7D%7C"><img alt="H(P)=\sum_{r,c} \log |S_{r,c}|" src="https://latex.codecogs.com/svg.latex?H(P)=%5Csum_%7Br,c%7D%20%5Clog%20%7CS_%7Br,c%7D%7C"></picture></p> 

と置く。これは真の結合エントロピーに対する上界的ヒューリスティクであり、相関を無視するという近似を内在するものの、縮約作用素の単調性から <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5CDelta%20H%5Cle%200"><img alt="\Delta H\le 0" src="https://latex.codecogs.com/svg.latex?\Delta%20H\le%200"></picture> が常に成り立つ。すなわち、候補削減 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DF"><img alt="F" src="https://latex.codecogs.com/svg.latex?F"></picture> は各セルの候補数 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%7CS_%7Br,c%7D%7C"><img alt="|S_{r,c}|" src="https://latex.codecogs.com/svg.latex?%7CS_%7Br,c%7D%7C"></picture> を減少させる方向にしか作用しないため、全体の和 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DH(P)"><img alt="H(P)" src="https://latex.codecogs.com/svg.latex?H(P)"></picture> も必ず単調非増加する。

探索においては、候補最小原理（MRV）

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(r%5E*,c%5E*)%5Cin%5Carg%5Cmin_%7B(r,c)%7D%20%7CS_%7Br,c%7D%7C"><img alt="(r^*,c^*)\in\arg\min_{(r,c)} |S_{r,c}|" src="https://latex.codecogs.com/svg.latex?(r%5E*,c%5E*)%5Cin%5Carg%5Cmin_%7B(r,c)%7D%20%7CS_%7Br,c%7D%7C"></picture></p> を基本規準とし、同点を weighted degree（各制約の失敗履歴に基づく重み <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dw(c)"><img alt="w(c)" src="https://latex.codecogs.com/svg.latex?w(c)"></picture> 

を用いて

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Csum_%7Bc%5Cni%20(r,c)%7D%20w(c)"><img alt="\sum_{c\ni (r,c)} w(c)" src="https://latex.codecogs.com/svg.latex?\sum_{c\ni%20(r,c)}%20w(c)"></picture></p>

を最大化する）や、仮置き後の局所伝播により得られる期待 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H"><img alt="-\Delta H" src="https://latex.codecogs.com/svg.latex?-\Delta%20H"></picture> を優先することで整序する。ここで <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H"><img alt="-\Delta H" src="https://latex.codecogs.com/svg.latex?-\Delta%20H"></picture> をより素直に確率的利得として扱うなら、各セル候補に一様事前 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dp(d)=%5Cfrac%7B1%7D%7B%7CS_%7Br,c%7D%7C%7D"><img alt="p(d)=1/|S_{r,c}|" src="https://latex.codecogs.com/svg.latex?p(d)=%5Cfrac%7B1%7D%7B%7CS_%7Br,c%7D%7C%7D"></picture></p>

を置き、仮置き後の候補サイズから事後 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dq(d)"><img alt="q(d)" src="https://latex.codecogs.com/svg.latex?q(d)"></picture> を近似して

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7BIG%7D(d)%20=%20%5Clog%20%7CS_%7Br,c%7D%7C%20-%20%5Csum_%7B(r%27,c%27)%7D%20%5Clog%20%7CS%27_%7Br%27,c%27%7D%7C"><img alt="\mathrm{IG}(d) = \log |S_{r,c}| - \sum_{(r',c')} \log |S'_{r',c'}|" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7BIG%7D(d)%20=%20%5Clog%20%7CS_%7Br,c%7D%7C%20-%20%5Csum_%7B(r%27,c%27)%7D%20%5Clog%20%7CS%27_%7Br%27,c%27%7D%7C"></picture></p>

を比較すればよい。分布としての挙動を強調するなら、微小平滑 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cepsilon%3E0"><img alt="\epsilon>0" src="https://latex.codecogs.com/svg.latex?%5Cepsilon%3E0"></picture> による正則化を加えた

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7BKL%7D(p%5Cparallel%20q)=%5Csum_%7Bd%5Cin%20D%7D%20p(d)%5Clog%5Cfrac%7Bp(d)%7D%7Bq(d)+%5Cepsilon%7D"><img alt="\mathrm{KL}(p\parallel q)=\sum_{d\in D} p(d)\log\frac{p(d)}{q(d)+\epsilon}" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7BKL%7D(p%5Cparallel%20q)=%5Csum_%7Bd%5Cin%20D%7D%20p(d)%5Clog%5Cfrac%7Bp(d)%7D%7Bq(d)+%5Cepsilon%7D"></picture></p>

を用いて推論規則の証拠強度を測ることも可能である。もっとも、これらは厳密な意味での統計モデル化ではなく、縮約量を秩序化するための理論的に一貫した近似的序関係を与えるものとして解すべきである。

計算複雑性の観点では、一般化された <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dn%5E2%5Ctimes%20n%5E2"><img alt="n^2\times n^2" src="https://latex.codecogs.com/svg.latex?n%5E2%5Ctimes%20n%5E2"></picture> 数独の充足可能性が NP 完全であることは標準的な結果であり、CNF SAT もしくはグラフ彩色からの多項式時間帰着によって示される。CNF への符号化では、命題変数 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DX_%7Br,c,d%7D"><img alt="X_{r,c,d}" src="https://latex.codecogs.com/svg.latex?X_%7Br,c,d%7D"></picture> を「セル <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(r,c)"><img alt="(r,c)" src="https://latex.codecogs.com/svg.latex?(r,c)"></picture> に値 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd"><img alt="d" src="https://latex.codecogs.com/svg.latex?d"></picture> を置く」ことに対応させると、変数は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D9%5Ccdot%209%5Ccdot%209=729"><img alt="9\cdot 9\cdot 9=729" src="https://latex.codecogs.com/svg.latex?9%5Ccdot%209%5Ccdot%209=729"></picture> 個となる。各セルちょうど一つの値という制約は

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cbigvee_d%20X_%7Br,c,d%7D%5Cquad%5Ctext%7BAND%7D%5Cquad%20%5Cbigwedge_%7Bd%5Cneq%20d%27%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br,c,d%27%7D)"><img alt="\bigvee_d X_{r,c,d}\quad\text{AND}\quad \bigwedge_{d\neq d'} (\neg X_{r,c,d}\vee \neg X_{r,c,d'})" src="https://latex.codecogs.com/svg.latex?\bigvee_d%20X_{r,c,d}\quad\text{AND}\quad%20\bigwedge_{d\neq%20d%27}%20(\neg%20X_{r,c,d}\vee%20\neg%20X_{r,c,d%27})"></picture></p>

により与えられ、行・列・ブロックごとの all-different は値ごとに

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cbigwedge_%7Br%7D%20%5Cbigwedge_%7Bc%5Cneq%20c%27%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br,c%27,d%7D),%5Cquad%20%5Cbigwedge_%7Bc%7D%20%5Cbigwedge_%7Br%5Cneq%20r%27%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br%27,c,d%7D),%5Cquad%20%5Cbigwedge_%7BB%7D%20%5Cbigwedge_%7B(r,c)%5Cneq%20(r%27,c%27)%5Cin%20B%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br%27,c%27,d%7D)"><img alt="\bigwedge_{r} \bigwedge_{c\neq c'} (\neg X_{r,c,d}\vee \neg X_{r,c',d}),\quad \bigwedge_{c} \bigwedge_{r\neq r'} (\neg X_{r,c,d}\vee \neg X_{r',c,d}),\quad \bigwedge_{B} \bigwedge_{(r,c)\neq (r',c')\in B} (\neg X_{r,c,d}\vee \neg X_{r',c',d})" src="https://latex.codecogs.com/svg.latex?%5Cbigwedge_%7Br%7D%20%5Cbigwedge_%7Bc%5Cneq%20c%27%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br,c%27,d%7D),%5Cquad%20%5Cbigwedge_%7Bc%7D%20%5Cbigwedge_%7Br%5Cneq%20r%27%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br%27,c,d%7D),%5Cquad%20%5Cbigwedge_%7BB%7D%20%5Cbigwedge_%7B(r,c)%5Cneq%20(r%27,c%27)%5Cin%20B%7D%20(%5Cneg%20X_%7Br,c,d%7D%5Cvee%20%5Cneg%20X_%7Br%27,c%27,d%7D)"></picture></p>

で与えられる。節数の増加は定数倍を含めても <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DO(9%5E3)"><img alt="O(9^3)" src="https://latex.codecogs.com/svg.latex?O(9%5E3)"></picture> の範囲に収まり、標準盤面でも数万節程度に過ぎない。たとえば各セルについての「少なくとも一つ（ALO）」は 81 節、続く「一つに限定（AMO）」は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D81%5Ctimes%2036%20=%202,916"><img alt="81\times 36 = 2,916" src="https://latex.codecogs.com/svg.latex?81%5Ctimes%2036%20=%202,916"></picture> 節を生み出す。さらに行・列・ブロックごとに値 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd"><img alt="d" src="https://latex.codecogs.com/svg.latex?d"></picture> を重複なく割り当てる制約を加えると、全体でおよそ 1.2 万節規模に達する。

CNF 符号化の正当性は、整合性（解があれば CNF を充足）と完全性（CNF のモデルから数独の解が復元可能）によって二方向で確認される。Exact Cover への還元は別の等価定式化であり、行列 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DA%5Cin%5C%7B0,1%5C%7D%5E%7B729%5Ctimes%20324%7D"><img alt="A\in\{0,1\}^{729\times 324}" src="https://latex.codecogs.com/svg.latex?A%5Cin%5C%7B0,1%5C%7D%5E%7B729%5Ctimes%20324%7D"></picture> を、行が候補 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(r,c,d)"><img alt="(r,c,d)" src="https://latex.codecogs.com/svg.latex?(r,c,d)"></picture>、列が 4 種類の制約

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Ctext%7Bcell%7D_%7Br,c%7D,%5Cquad%20%5Ctext%7Brow%7D_%7Br,d%7D,%5Cquad%20%5Ctext%7Bcol%7D_%7Bc,d%7D,%5Cquad%20%5Ctext%7Bbox%7D_%7Bb,d%7D"><img alt="\text{cell}_{r,c},\quad \text{row}_{r,d},\quad \text{col}_{c,d},\quad \text{box}_{b,d}" src="https://latex.codecogs.com/svg.latex?%5Ctext%7Bcell%7D_%7Br,c%7D,%5Cquad%20%5Ctext%7Brow%7D_%7Br,d%7D,%5Cquad%20%5Ctext%7Bcol%7D_%7Bc,d%7D,%5Cquad%20%5Ctext%7Bbox%7D_%7Bb,d%7D"></picture></p>

で表され、ブロック番号 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Db"><img alt="b" src="https://latex.codecogs.com/svg.latex?b"></picture> はセル座標 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D(r,c)"><img alt="(r,c)" src="https://latex.codecogs.com/svg.latex?(r,c)"></picture> から <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Db=3%5Clfloor(r-1)/3%5Crfloor+%5Clfloor(c-1)/3%5Crfloor+1"><img alt="b=3\lfloor(r-1)/3\rfloor+\lfloor(c-1)/3\rfloor+1" src="https://latex.codecogs.com/svg.latex?b=3%5Clfloor(r-1)/3%5Crfloor+%5Clfloor(c-1)/3%5Crfloor+1"></picture> によって一意に定まる。この規則に従って行列を構成し、該当する制約列に 1 を立てると、問題は「各列をちょうど一度ずつ被覆する行集合」を求める Exact Cover として定式化される。Algorithm X はこの被覆集合を探索する手続きであり、Dancing Links（DLX）はその効率的な連結リスト実装である。正当性は、選ばれた行集合が正確に一つの値割当と 4 種の制約充足を同時に与えることから直ちに従う。さらに列選択における「最小 1 の列」を優先するヒューリスティクは探索木の分岐係数を平均的に著しく低減し、この点で候補格子側の MRV（Minimum Remaining Values）ヒューリスティクと概念的に対応する。すなわち MRV が「選択肢の稀少なセル」を選ぶのに対し、DLX の列最小選択は「支持の稀少な制約列」を選ぶのであり、両者はいずれも希薄性という同一の構造特性を異なる表現系で測っているに他ならない。

一意性検証に関しては、<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathsf%7BUNQ%7D(P)"><img alt="\mathsf{UNQ}(P)" src="https://latex.codecogs.com/svg.latex?%5Cmathsf%7BUNQ%7D(P)"></picture> の定義が示す通り存在と非存在の複合であるため、実装上は「一解発見後、別解を一つ見つけ次第停止する」戦略が自然である。これは誤陰性を生まない（別解が存在すれば必ず見つけた時点で非一意と結論できる）が、誤陽性を避けるには「発見されなかった」ことの側にも証明的重みが必要であり、探索戦略は有限であること、枝刈りは健全であることが条件となる。DLX の場合、列カバーの全探索は有限であり、特定の枝刈り（例えば一意性検査に不要な対称性の打ち切り）を導入しない限り、探索空間の完全走査により非存在が保証される。候補格子側の探索では、局所推論の健全性（削除は常に安全）とバックトラックの完全性（全割当への網羅）により、同様に非存在の主張が裏付けられる。

代数学の側面は、完成盤の計数や生成の重複排除に決定的である。保存される対称性は、数字置換群 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DS_9"><img alt="S_9" src="https://latex.codecogs.com/svg.latex?S_9"></picture>、行や列のバンド・スタック単位の置換、各バンド内の行置換・各スタック内の列置換、そして正方形の回転・反転（正方形の二面体群）である。これらを総合した群 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DG"><img alt="G" src="https://latex.codecogs.com/svg.latex?G"></picture> が盤面集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5COmega"><img alt="\Omega" src="https://latex.codecogs.com/svg.latex?%5COmega"></picture> に作用するとき、軌道分解 

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5COmega=%5Cbigsqcup_%7Bi%7D%20G%5Ccdot%20%5Comega_i"><img alt="\Omega=\bigsqcup_{i} G\cdot \omega_i" src="https://latex.codecogs.com/svg.latex?%5COmega=%5Cbigsqcup_%7Bi%7D%20G%5Ccdot%20%5Comega_i"></picture></p> 

が得られ、同値類代表 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Comega_i"><img alt="\omega_i" src="https://latex.codecogs.com/svg.latex?%5Comega_i"></picture> のみに対して探索すればよい。軌道の大きさは安定化群 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DG_%7B%5Comega%7D"><img alt="G_{\omega}" src="https://latex.codecogs.com/svg.latex?G_%7B%5Comega%7D"></picture> を用いて <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%7CG%5Ccdot%20%5Comega%7C=%7CG%7C/%7CG_%7B%5Comega%7D%7C"><img alt="|G\cdot \omega|=|G|/|G_{\omega}|" src="https://latex.codecogs.com/svg.latex?%7CG%5Ccdot%20%5Comega%7C=%7CG%7C/%7CG_%7B%5Comega%7D%7C"></picture> と与えられ、これが計数と重複排除の両面に効く。Burnside の補題

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%7C%5COmega/G%7C=%5Cfrac%7B1%7D%7B%7CG%7C%7D%5Csum_%7Bg%5Cin%20G%7D%20%7C%5Cmathrm%7BFix%7D(g)%7C"><img alt="|\Omega/G|=\frac{1}{|G|}\sum_{g\in G} |\mathrm{Fix}(g)|" src="https://latex.codecogs.com/svg.latex?%7C%5COmega/G%7C=%5Cfrac%7B1%7D%7B%7CG%7C%7D%5Csum_%7Bg%5Cin%20G%7D%20%7C%5Cmathrm%7BFix%7D(g)%7C"></picture></p> 

を用いれば、群作用の対称性を「固定される盤面数」の平均として評価できる。実務的には、生成段で代表元規約（例えば辞書式最小の行列形）を課すことで、探索木における同型分枝を未然に抑圧するのが有効である。

難易度の定義は、単なる手数や分岐回数を超えて、縮約過程と探索過程の双方を含む汎関数として与えられるべきである。情報理論的観点からは、時間離散化 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5C%7Bt=0,1,2,%5Cdots%5C%7D"><img alt="\{t=0,1,2,\dots\}" src="https://latex.codecogs.com/svg.latex?%5C%7Bt=0,1,2,%5Cdots%5C%7D"></picture> に対して

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathcal%20D(P)=%5Csum_%7Bt%7D%20%5CBigl(-%5CDelta%20H_t%5CBigr)%20+%20%5Clambda%20%5Csum_%7B%5Ctext%7Bbranch%20%7Db%7D%20%5Cbigl(1+%5Cmu%5C,%5Cmathrm%7Bdepth%7D(b)%5Cbigr)"><img alt="\mathcal D(P)=\sum_{t} \Bigl(-\Delta H_t\Bigr) + \lambda \sum_{\text{branch }b} \bigl(1+\mu\,\mathrm{depth}(b)\bigr)" src="https://latex.codecogs.com/svg.latex?%5Cmathcal%20D(P)=%5Csum_%7Bt%7D%20%5CBigl(-%5CDelta%20H_t%5CBigr)%20+%20%5Clambda%20%5Csum_%7B%5Ctext%7Bbranch%20%7Db%7D%20%5Cbigl(1+%5Cmu%5C,%5Cmathrm%7Bdepth%7D(b)%5Cbigr)"></picture></p> 

のように、純粋推論で得られる情報圧縮量の総和と、探索による分岐コスト（分岐の個数や深さ）を線形結合するのが自然である。ここで <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Clambda,%5Cmu%3E0"><img alt="\lambda,\mu>0" src="https://latex.codecogs.com/svg.latex?%5Clambda,%5Cmu%3E0"></picture> は単位系を整える重みであり、推論が進まない局面では探索コストが支配的に、推論が強力に働く局面では <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H"><img alt="-\Delta H" src="https://latex.codecogs.com/svg.latex?-\Delta%20H"></picture> が支配的になる。解析的には、<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H_t"><img alt="-\Delta H_t" src="https://latex.codecogs.com/svg.latex?-%5CDelta%20H_t"></picture> はサブモジュラ性の近似を示すことが多く、推論手筋の合成が限界効用逓減を示唆することから、貪欲的適用がしばしば高品質の近似を与えるという経験則に理論的基盤を与える。

Python による計算的実現は、上述の理論をそのまま具体化する。候補集合を 9 ビット整数 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DC_%7Br,c%7D%5Cin%5C%7B0,%5Cdots,2%5E9-1%5C%7D"><img alt="C_{r,c}\in\{0,\dots,2^9-1\}" src="https://latex.codecogs.com/svg.latex?C_%7Br,c%7D%5Cin%5C%7B0,%5Cdots,2%5E9-1%5C%7D"></picture> で表現し、ビット番号は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7Dd%5Cin%5C%7B1,%5Cdots,9%5C%7D"><img alt="d\in\{1,\dots,9\}" src="https://latex.codecogs.com/svg.latex?d%5Cin%5C%7B1,%5Cdots,9%5C%7D"></picture> を 1-based として

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7Bmask%7D(d)=1%5Cll%20(d-1)"><img alt="\mathrm{mask}(d)=1\ll (d-1)" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7Bmask%7D(d)=1%5Cll%20(d-1)"></picture></p> 

を採る。行・列・ブロックの使用済み集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DU%5E%5Cmathrm%7Brow%7D_r,U%5E%5Cmathrm%7Bcol%7D_c,U%5E%5Cmathrm%7Bbox%7D_b"><img alt="U^\mathrm{row}_r,U^\mathrm{col}_c,U^\mathrm{box}_b" src="https://latex.codecogs.com/svg.latex?U%5E%5Cmathrm%7Brow%7D_r,U%5E%5Cmathrm%7Bcol%7D_c,U%5E%5Cmathrm%7Bbox%7D_b"></picture> をビット和で維持し、更新則

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DC_%7Br,c%7D%5Cleftarrow%20C_%7Br,c%7D%5C%20%5C&%5C%20%5Cneg%5CBigl(U%5E%5Cmathrm%7Brow%7D_r%5C%20%5Cvert%5C%20U%5E%5Cmathrm%7Bcol%7D_c%5C%20%5Cvert%5C%20U%5E%5Cmathrm%7Bbox%7D_b%5CBigr)"><img alt="C_{r,c}\leftarrow C_{r,c}\ \&\ \neg\Bigl(U^\mathrm{row}_r\ \vert\ U^\mathrm{col}_c\ \vert\ U^\mathrm{box}_b\Bigr)" src="https://latex.codecogs.com/svg.latex?C_%7Br,c%7D%5Cleftarrow%20C_%7Br,c%7D%5C%20%5C&%5C%20%5Cneg%5CBigl(U%5E%5Cmathrm%7Brow%7D_r%5C%20%5Cvert%5C%20U%5E%5Cmathrm%7Bcol%7D_c%5C%20%5Cvert%5C%20U%5E%5Cmathrm%7Bbox%7D_b%5CBigr)"></picture></p> 

により禁止値を排除する。候補数は <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmathrm%7Bpopcount%7D(C_%7Br,c%7D)"><img alt="\mathrm{popcount}(C_{r,c})" src="https://latex.codecogs.com/svg.latex?%5Cmathrm%7Bpopcount%7D(C_%7Br,c%7D)"></picture> により定数時間で得られる。Kleene 反復は、固定長のキューで「変化したセルの近傍三系」を再処理することで実現でき、停止は有限束上の降鎖条件から自動的に保証される。探索では MRV により <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Cmin%20%5Cmathrm%7Bpopcount%7D"><img alt="\min \mathrm{popcount}" src="https://latex.codecogs.com/svg.latex?%5Cmin%20%5Cmathrm%7Bpopcount%7D"></picture> のセルを選び、同数の場合には仮置き → 局所伝播 → <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H"><img alt="-\Delta H" src="https://latex.codecogs.com/svg.latex?-\Delta%20H"></picture> ないし dom/wdeg の増加が最大のものを優先する。ここで dom/wdeg は、失敗した制約に重みを加算し、以後その制約に関与する変数が優先されるようにする経験的にも強力な規準である。DLX への切替は、候補格子が不動点に達し、かつ未確定セルが残る局面で行うのが自然で、候補稀少性の極端な列（値・行・列・ブロックのいずれか）から探索することで分岐係数を抑える。ユニット伝播や二項節学習に相当する「ノーグッド学習」は、候補格子側では禁則パターンとして、DLX 側では部分的列被覆の不能集合として蓄積でき、いずれも探索の重複を抑止する。

生成問題においては、完全盤 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Csigma"><img alt="\sigma" src="https://latex.codecogs.com/svg.latex?%5Csigma"></picture> を乱択により獲得し、与え値集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DG%5Csubseteq%20V"><img alt="G\subseteq V" src="https://latex.codecogs.com/svg.latex?G%5Csubseteq%20V"></picture> を初期化した後、<picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DG"><img alt="G" src="https://latex.codecogs.com/svg.latex?G"></picture> から要素を一つずつ候補削除して一意性が保持される場合に限り削除を確定する。ここでの一意性検証は、DLX により一解を見つけた後、二解目の探索を行い、見つかればただちに「非一意」と結論し、見つからなければ全探索の完走によって「一意」を主張するという、理論的にも実装的にも節度ある手順で足りる。難易度を制御した問題生成を行うには、削除の各ステップで Kleene 反復がもたらす情報圧縮 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D-%5CDelta%20H"><img alt="-\Delta H" src="https://latex.codecogs.com/svg.latex?-\Delta%20H"></picture> の積算や、のちの探索で消費される分岐コストの予測値を合成したメタロス <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5CPhi(G)"><img alt="\Phi(G)" src="https://latex.codecogs.com/svg.latex?%5CPhi(G)"></picture> を設計し、焼きなましや確率的勾配法により所望の <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5CPhi"><img alt="\Phi" src="https://latex.codecogs.com/svg.latex?%5CPhi"></picture> に近づくよう与え値を選別する。群作用の利用により、与え値集合 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DG"><img alt="G" src="https://latex.codecogs.com/svg.latex?G"></picture> の同型を事前に同値類へ商取りすることで、冗長な候補を塊ごと棄却でき、探索空間は指数的に圧縮される。

最後に、数独が「単純さ」と「可圧縮性」の緊張を内蔵する数学的対象であることを強調する。完成盤の総数は天文学的であり探索空間 <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D9%5E%7B81%7D"><img alt="9^{81}" src="https://latex.codecogs.com/svg.latex?9%5E%7B81%7D"></picture> は桁外れであるにもかかわらず、候補格子上の単調縮約と、情報利得を最大化する探索規準の組合せは、与え値の少ない局面からでも短い計算で大きなエントロピーを消去する。ここで働いているのは、完備束上の不動点理論、群作用と同値類の商、Exact Cover による厳密離散最適化、そして情報理論的尺度による序付けであり、これらが一体となって「手筋」と呼ばれる人間のヒューリスティクを理論の言葉で再解釈する。解が一意であるとは、Exact Cover の観点では列選択の軌道がただ一つの被覆に収束すること、情報理論の観点では <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7DH(P)%5Cto%200"><img alt="H(P)\to 0" src="https://latex.codecogs.com/svg.latex?H(P)%5Cto%200"></picture> が唯一の経路で達成されること、格子論の観点では <picture><source media="(prefers-color-scheme: dark)" srcset="https://latex.codecogs.com/svg.latex?%5Ccolor%7Bwhite%7D%5Coperatorname%7Blfp%7D(F)"><img alt="\operatorname{lfp}(F)" src="https://latex.codecogs.com/svg.latex?%5Coperatorname%7Blfp%7D(F)"></picture> の近傍が単一の極小要素に収束することに等価である。かくして数独は、遊戯と学理の二重性を統合し、有限数学の深層を可視化する作動的理論模型として、研究書の対象に相応しい厳格さと豊穣さを兼ね備えている。



## 2. 推論規則の設計

数独を <ruby>制約充足問題<rt>せいやくじゅうそくもんだい</rt></ruby> (CSP) として定式化した場合、解読過程の核心は候補集合の段階的削減にある。候補集合全体は

$$
\Sigma = \prod_{r,c} \mathcal{P}(\{1,\dots,9\})
$$

と表され、 $\sigma \in \Sigma$ は「全セルにおける候補集合の配置」を意味する。この $\Sigma$ は包含関係に基づく順序構造を持ち、<ruby>完備束<rt>かんびそく</rt></ruby> (complete lattice) をなす。最大元は「全てのセルが $\{1,\dots,9\}$ を候補として保持する状態」、最小元は「全てのセルが確定値を持つ解状態」である。候補削減の過程を束上の写像として形式化することで、推論規則の性質を一般的な代数的枠組みの中に位置づけることができる。

推論規則とは $\gamma : \Sigma \to \Sigma$ で表される写像であり、制約に基づいて候補集合を縮小する作用を持つ。この種の作用素は形式概念分析やデータベース理論における <ruby>closure operator<rt>クロージャ作用素</rt></ruby> と同型であり、つねに以下の二性質を満たす。第一に **<ruby>単調性<rt>たんちょうせい</rt></ruby> (monotonicity)**： $A \subseteq B \implies \gamma(A) \subseteq \gamma(B)$ 。これは情報が増えれば推論による候補削減もそれに従うことを意味する。第二に **<ruby>冪等性<rt>べきとうせい</rt></ruby> (idempotency)**： $\gamma(\gamma(\sigma)) = \gamma(\sigma)$ 。すなわち同一の規則を繰り返し適用しても新しい情報は生じず、有限回の適用で安定化する。これら二つの性質に加え、通常の推論規則は **<ruby>縮小性<rt>しゅくしょうせい</rt></ruby> (contractiveness)** をも満たす。すなわち $\gamma(\sigma) \subseteq \sigma$ が常に成立し、候補が増えることはない。


複数の規則 $\gamma_1,\dots,\gamma_k$ を合成した写像 $\Gamma = \gamma_1 \circ \gamma_2 \circ \cdots \gamma_k$ もまた <ruby>縮約作用素<rt>しゅくやくさようそ</rt></ruby> である。このとき <ruby>反復過程<rt>はんぷくかてい</rt></ruby>

$$
\sigma_{t+1} = \Gamma(\sigma_t), \qquad \sigma_0 = \sigma_{\text{init}}
$$

は必ず <ruby>最小不動点<rt>さいしょうふどうてん</rt></ruby>

$$
\mathrm{lfp}(\Gamma) = \lim_{t \to \infty} \sigma_t
$$

に到達する。これは Knaster–Tarski の <ruby>不動点定理<rt>ふどうてんていり</rt></ruby> の <ruby>直接的帰結<rt>ちょくせつてききけつ</rt></ruby> であり、到達点 $\mathrm{lfp}(\Gamma)$ は「論理的に尽きるまで候補削減を施した <ruby>極限状態<rt>きょくげんじょうたい</rt></ruby>」に対応する。このことは、推論過程を単なる <ruby>逐次的操作<rt>ちくじてきそうさ</rt></ruby> ではなく、<ruby>不動点計算<rt>ふどうてんけいさん</rt></ruby> として体系的に理解できることを示す。

推論規則の適用が有効であるためには、**<ruby>健全性<rt>けんぜんせい</rt></ruby> (soundness)** が保証されなければならない。形式的には、任意の <ruby>解写像<rt>かいしゃぞう</rt></ruby> $\sigma^* : V \to \{1,\dots,9\}$ に対して

$$
\sigma^*(r,c) \in \gamma(\sigma)(r,c)
\qquad \forall (r,c)\in V.
$$

すなわち推論によって削除された候補は、元の CSP におけるいかなる解にも含まれない。健全性は局所的な削除操作が解空間を誤って排除しないことを保証する点で不可欠である。一方で、推論規則群が **<ruby>完全性<rt>かんぜんせい</rt></ruby> (completeness)** を持つとは限らない。すなわち規則適用をいくら繰り返しても候補が一意に収束せず、<ruby>探索<rt>たんさく</rt></ruby> が <ruby>不可避<rt>ふかひ</rt></ruby> となる場合が存在する。したがって推論規則は論理的帰結の「<ruby>計算可能な近似<rt>けいさんかのうなきんじ</rt></ruby>」に過ぎないが、それでも SAT ソルバにおける unit propagation と同様に、解探索を劇的に効率化する役割を果たす。

具体的規則としては、セルの候補が唯一に絞られた場合に確定する naked single、行・列・ブロック内である数字がただ一つのセルにしか現れない場合に確定する hidden single、ブロックと行・列の包含関係に基づく pointing pair や claiming、候補配置の対称性に依拠する X-Wing や Swordfish、さらに候補を命題変数に写像し含意グラフを構成することで矛盾や強制を検出するチェイン規則などが挙げられる。これらはいずれも **<ruby>単調性<rt>たんちょうせい</rt></ruby>・<ruby>冪等性<rt>べきとうせい</rt></ruby>** を満たし、健全性を保証するため、適用過程全体は「<ruby>形式的証明列<rt>けいしきてきしょうめいれつ</rt></ruby>」として理解できる。

極限状態 $\mathrm{lfp}(\Gamma)$ は推論規則のみで到達できる論理的限界を与える。しかし多くの数独問題では、この不動点に到達してもなお未確定のセルが残る。このとき探索（<ruby>分岐帰納法<rt>ぶんききのうほう</rt></ruby>、バックトラック、あるいは <ruby>分岐限定法<rt>ぶんきげんていほう</rt></ruby>）が不可欠となる。すなわち推論規則は探索の <ruby>補助手段<rt>ほじょしゅだん</rt></ruby> として位置づけられ、候補集合を削減し探索空間を大幅に <ruby>剪定<rt>せんてい</rt></ruby> する役割を担う。形式的には、推論は完全な解空間探索に先立つ <ruby>局所的制約伝播<rt>きょくしょてきせいやくでんぱ</rt></ruby> として理解され、計算論的論理における constraint propagation の <ruby>典型的事例<rt>てんけいてきじれい</rt></ruby> と見なせる。

結局のところ、数独における候補削減の形式化は、単なるパズル解法技術にとどまらず、縮約作用素の不動点理論、健全性と完全性の区別、制約伝播と探索の相補関係といった <ruby>計算論的基礎概念<rt>けいさんろんてききそがいねん</rt></ruby> を具体的に検証する場を提供する。ここに数独の推論規則の <ruby>学術的価値<rt>がくじゅつてきかち</rt></ruby> がある。



<h2 id="3-limited-search">3. <ruby>限定的探索<rt>げんていてきたんさく</rt></ruby></h2>

推論規則による <ruby>縮約<rt>しゅくやく</rt></ruby> を繰り返してもなお盤面が完全に決定しない場合、探索が不可避となる。ここでいう探索とは、あるセルに仮置きを行い、その後の帰結を逐次検証しながら <ruby>分岐<rt>ぶんき</rt></ruby> と <ruby>バックトラック<rt>backtrack</rt></ruby> を行う過程を指す。探索空間の理論的上界は $9^{81} \approx 10^{77}$ 通りに及ぶため、無作為な試行は現実的ではない。したがって探索効率の鍵は「どのセルを分岐点に選ぶか」にある。

基本的かつ有効な戦略として **Minimum Remaining Value (MRV)** ヒューリスティクスが知られている。これは候補数が最小のセルを優先的に選択するものであり、早期に矛盾を露呈させて探索木の枝を <ruby>剪定<rt>せんてい</rt></ruby> できる効果を持つ。形式的には「最も制約の強い変数から試す」という原則に対応し、制約伝播を強力に補完する。実際に MRV を用いない場合の探索木の平均分岐数は 5 前後に達するが、MRV を導入することで 2〜3 程度まで減少することが経験的に報告されている。候補数が等しいセルが複数存在する場合には、セルが属する行・列・ブロックにおける未確定セル数が多いものを選択する **Degree ヒューリスティクス** を組み合わせることが効果的である。これは「最も他に影響を及ぼす変数」を優先する戦略であり、探索効率をさらに高める。

より洗練された基準として、情報理論的な指標であるエントロピーを導入することができる。変数 $v$ に候補集合 $D(v)$ が割り当てられているとし、各候補値 $d \in D(v)$ に確率 $p_d$ が割り当てられるとき、その不確実性は

$$
H(v) = -\sum_{d \in D(v)} p_d \log p_d
$$

によって測定される。エントロピー $H(v)$ が小さいセルを分岐点として選択することは、探索によって不確実性を最も削減できる箇所を優先することに対応する。確率 $p_d$ の設定方法としては、単純に一様分布 $p_d = \frac{1}{|D(v)|}$ を仮定する場合のほか、制約伝播の頻度や過去の探索履歴に基づいて統計的に推定する方法も考えられる。このアプローチは <ruby>確率的制約充足問題<rt>かくりつてきせいやくじゅうそくもんだい</rt></ruby> やベイズ的最適化との関連を持ち、数独を超えて汎用的な探索戦略への接続を可能にする。

探索過程における失敗は単なる後戻りにとどまらない。ある仮置きの下で矛盾が生じた場合、その矛盾は具体的な候補集合に関する「ノーグッド (nogood)」として記録され、以降の探索で再利用される。これが **<ruby>失敗駆動学習<rt>しっぱいくどうがくしゅう</rt></ruby> (failure-driven learning)** の基本理念である。形式的には、探索におけるノーグッド集合は $\Sigma$ 上の禁止領域を逐次拡張する過程とみなすことができ、これは SAT ソルバにおける **<ruby>節学習<rt>せつがくしゅう</rt></ruby> (clause learning)** と構造的に同型である。すなわち、局所的な矛盾情報を全体に伝播させることによって、探索の重複計算を回避しつつ <ruby>健全性<rt>けんぜんせい</rt></ruby> を保持することが可能となる。

このように限定的探索は、単なる力任せの試行錯誤ではなく、ヒューリスティクスと学習機構を統合した体系的な推論過程である。推論規則による候補削減と探索ヒューリスティクスによる分岐選択とを組み合わせることで、数独の解読は実用的時間内に遂行可能となり、同時に制約充足問題における一般的探索戦略の理論的研究に対しても重要な示唆を与えるのである。




## 4. データ構造と演算効率

数独解読の実装効率を根本的に規定するのは、候補集合および制約状態の表現方法である。推論規則や探索戦略の理論的優劣も、実装上の表現形式によって大きく性能が変化するため、この層の設計は単なる実装技法にとどまらず、アルゴリズム工学的な研究対象として重要である。

最も有効な表現形式は **ビットマスク表現**である。各セル $(r,c)$ の候補集合を 9 ビット整数として符号化し、第 $d$ ビットが 1 であるとき、そのセルが数字 $d$ を候補として許容していると解釈する。例えば候補が $\{1,3,9\}$ の場合、そのビット列は $100000101_2$ に対応する。この表現を採用することで、候補削減や候補数の計算は低レベルなビット演算に帰着する。具体的には `AND`, `OR`, `XOR` による集合操作、`popcount` による候補数計算などが定数時間で処理できる。すなわち、制約伝播の核心処理をアルゴリズム的に $O(1)$ に収束させることができる。

行・列・ブロックごとの使用済み数字の管理も同様に 9 ビット整数で表現できる。あるセルの候補から行・列・ブロックで既に使用済みの数字を排除する操作は

$$
C_{r,c} \leftarrow C_{r,c} \setminus \{d \mid d \in \text{row}(r) \cup \text{col}(c) \cup \text{box}(b)\}
$$

に対応し、ビットマスクの単純な除去演算として一括で実行できる。Python のような高水準言語であっても、整数に対するビット演算は極めて高速であり、C 言語レベルの最適化を行わずとも十分に実用的な性能が得られる。すなわち、言語間の実装差はここではほとんど律速要因とならない。

さらに洗練された設計として、盤面更新を **永続データ構造 (persistent data structure)** として管理する方式がある。これは関数型プログラミングにおける参照透明性を基盤とする設計思想であり、盤面の各更新を差分として記録する。これにより undo/redo 操作は「差分参照の切り替え」として実現でき、任意の過去状態への遡及や分岐状態の保持を効率的に行える。データ構造的には、盤面を木構造や差分リストとして管理し、共有部分を再利用することでコピーコストを削減することができる。

この仕組みは単に実装上の利便性にとどまらない。数独の解読過程はしばしば分岐探索と推論削減の反復からなり、複数の盤面状態を並行的に保持する必要がある。このとき永続データ構造を用いれば、バックトラック探索が参照透過的に実行可能となり、探索木全体を効率的に横断する基盤を提供する。すなわち、探索におけるノード遷移が「状態の破壊的変更」ではなく「差分付き状態の選択」として定式化されることにより、計算過程全体が理論的に明瞭かつ実装的に高効率となる。

このように、候補集合のビットマスク表現と盤面の永続的管理は、数独アプリケーションの性能とユーザ体験を決定づける基盤である。演算効率の確立によって推論規則や探索戦略が実用的に機能し、差分管理によって人間にとって自然な操作（undo/redo や段階的解読の提示）が可能になる。データ構造と演算効率の設計は、数独解読システムを単なるパズル解法器から、理論的に整備された実験環境へと昇華させる鍵である。



## 5. 難易度の計量学

数独における「難易度」という概念は、素朴に考えれば与え値の数や初期配置の疎密度といった表層的な指標によって測られそうに見える。しかし実際にはそれは不十分であり、問題を解く際にどのような種類の推論規則を適用しなければならないか、その規則の複雑さや人間にとっての認知的負荷がどの程度か、さらに論理規則の適用だけでは解が得られず探索（仮置きとバックトラック）が必要になるかどうかといった要因が総合的に作用している。したがって難易度は、与え値の少なさではなく、解読過程そのものの複雑性を測る複合的な概念として定義されるべきである。

この複雑性を形式化するために、まず各推論規則に固有の「原価」を定義する。たとえば naked single のように候補集合が自明に一つに収束する規則は人間にとって直観的に理解可能であるため低コストが割り当てられる。一方で X-Wing や Swordfish といった行列的パターンの検出は視覚的・認知的負荷が大きく、より高いコストを与えることが妥当である。盤面解読の trace を通じて適用された規則の列を $\{r_t\}$ とするとき、論理的コストは

$$
\mathrm{Cost}_{\text{logic}} = \sum_t w(r_t)
$$

と定義される。ただし $w(r_t)$ は規則 $r_t$ に割り当てられた定数である。この値は理論的に定めることもできるが、実際には既存の問題集に対する経験的調整によって較正される。

しかし、論理規則だけで問題が解けるとは限らない。推論の閉包に達しても未確定セルが残る場合には探索が導入される。このときの探索は、仮置きと矛盾検出に基づく分岐とバックトラックからなるため、計算機的には指数的複雑性を伴い、人間にとっても「試しに置いてみて矛盾を確認する」という非直感的な操作を強いる。従って探索のコストは論理規則よりも桁違いに大きく評価する必要がある。分岐の数を $N_{\text{branch}}$、各分岐の深さを $\mathrm{depth}$ とすれば、探索コストは

```math
\mathrm{Cost}_{\text{search}} = \lambda N_{\text{branch}} + \mu \sum_{i=1}^{N_{\text{branch}}} d_i
```

の形で定義できる。ここで $d_i$ は $i$ 番目の分岐の深さである。

さらに情報理論的視点から候補集合の不確実性を定量化することができる。セル $v$ の候補集合 $D(v)$ に対して、候補 $d \in D(v)$ の出現確率を $p_d$ とすれば、エントロピーは

$$
H(v) = -\sum_{d \in D(v)} p_d \log p_d
$$

と定義される。この値は候補の散らばり具合を測る尺度であり、推論によって候補数が減少するごとに $H(v)$ も減少する。したがって各ステップにおける情報削減量 $\Delta H_t$ を評価し、それを総和することによって盤面全体の「情報収束度」を定量化できる。効率よく候補が削減されるほど $\Delta H_t$ は大きく、解読は容易であると解釈できる。

以上を総合すると、数独の難易度は単なる主観的感覚ではなく、論理的コスト、探索コスト、情報削減の三要素から構成される形式的指標として定義できる。その具体形は

$$
D = \alpha\ C_{\text{logic}} + \beta\ C_{\text{search}} - \gamma \sum_{t=1}^{T} \Delta H_t
$$

で与えられる。ここで $C_{\text{logic}}$ は推論規則の適用に伴う論理的コスト、 $C_{\text{search}}$ は仮置きやバックトラックに基づく探索コスト、 $\Delta H_t$ は第 $t$ ステップにおける情報量削減、 $T$ は推論過程の全ステップ数を表す。また $\alpha,\beta,\gamma$ は実験的に決定される重みであり、既存の問題集に対して回帰的に最適化される。こうして得られた $D$ は、問題を難易度クラス（Easy, Medium, Hard, Expert など）に分類する客観的な基準として機能し、ユーザが問題を選択する際の有効な指標となる。



## 6. 問題生成と一意性保証

数独の問題生成における本質的な課題は、任意に配置された初期値の集合から出発するのではなく、あらかじめ整合的な完全解を構築したうえで、そこから与え値を削除しつつ常に一意解性を保持するという「逆問題」として定式化される点にある。完全盤 $\sigma$ はまず制約充足アルゴリズムによって生成され、これにより全てのセルが充足条件を満たすことが保証される。この完全盤から出発し、与え値の集合 $G \subseteq V$ を初期状態として保持する。すなわち最初は $G = V$ であり、全てのセルに値が埋め込まれている。

生成アルゴリズムは $G$ から逐次的に要素を削除する操作を繰り返す。ただし重要なのは、削除のたびに「削除後の盤面が依然として一意解性を有するか」を必ず検証する点である。一意性が保持される場合に限り削除を確定し、保持されない場合には削除を棄却する。この反復過程によって、最終的に最小限の与え値を持つが一意解性を保つ問題が得られる。

ここで核心となるのが一意性判定のアルゴリズムである。これは exact cover 問題に還元される。すなわち $729 \times 324$ の疎行列を構築し、729 行は「セル $(r,c)$ に数字 $d$ を配置する」という可能な割当を表し、324 列は「各セルに一つの値が入る」「各行に 1 から 9 が一度ずつ現れる」「各列に 1 から 9 が一度ずつ現れる」「各ボックスに 1 から 9 が一度ずつ現れる」という四種類の制約に対応する。この行列に対して Donald Knuth によって提案された Dancing Links (DLX) アルゴリズムを適用することで exact cover を効率的に探索できる。DLX は双方向連結リストによるカラム削除・復元操作を用いるため、組合せ爆発を伴う探索をきわめて効率的に進めることができる。

一意性の確認においては「二解存在検査」として DLX を動作させる。すなわち、一つの解を見つけても探索を終了せず、第二の解を発見した時点で即座に停止する。この時点で盤面は非一意であると判定され、削除操作は棄却される。これにより「解が一つしか存在しない」という条件を高効率に検証することが可能になる。

さらに生成過程においては、問題の難易度を制御する仕組みが求められる。完全にランダムに与え値を削除した場合、得られる問題の難易度は制御不能であり、ユーザにとって容易すぎたり、逆に過度に難解であったりすることがある。これを防ぐために確率的探索法を導入する。代表的なのは焼きなまし法であり、ここでは現在の問題の難易度 $\mathrm{Diff}$ と目標とする難易度 $\mathrm{Diff}^*$ との差を評価する。前回の難易度との差分を考慮に入れた上で、削除操作を受容するかどうかはメトロポリス基準に従って確率的に決定される。すなわち受容確率は

$$
p = \min \Biggl( 1,\ \exp \Biggl[ -\frac{ \bigl\lvert D - D^{\ast}\bigr\rvert - \bigl\lvert D_{\text{prev}} - D^{\ast}\bigr\rvert }{T} \Biggr] \Biggr)
$$

で与えられる。ここで $D$ は現在の難易度指標、 $D^*$ は目標難易度、 $D_{\text{prev}}$ は直前の難易度、 $T$ は温度パラメータである。反復の進行に伴い $T$ を徐々に減少させることで、局所的最適解に陥ることを避けつつ、大域的に所望の難易度へと収束させることができる。

この確率的手続きを繰り返すことにより、生成される問題は常に一意解性を保持しながら、目標とする難易度に漸近する。したがって本方式によって得られる数独問題は、単に解を持つだけでなく、難易度が設計者の意図に適合するよう調整される。利用者はこれにより、容易な問題から高度に難解な問題まで、自らの学習目的や娯楽的要求に応じて選択・生成することが可能となる。



## 7. GUI と可視化

数独解読アルゴリズムを数理的基盤の上に構築する際、その成果をユーザに提示するインターフェース設計は単なる視覚的補助の域を超え、むしろ推論の正統性を保証し、制約充足過程の可視的証跡を与えるという学術的意義を帯びる。数独盤面は形式上 $9\times 9$ の有限格子にすぎないが、その背後には全単射制約、候補集合の逐次縮約、矛盾検出という複雑な論理的機構が潜在しており、これらをどのように人間の直観に訴えかけるかが応用的観点からは決定的である。すなわち GUI の設計は、アルゴリズムの内部論理と人間の認知過程との間に立つ媒介層として機能しなければならず、そのためには可視化の手法自体が数学的に整合し、かつ解読の進行を忠実に反映する必要がある。

まず最も基礎的な水準において、選択されたセルを基準にその行・列・ボックスに属するセルを同系統の彩色で強調することが求められる。この操作は形式的には all-different 制約の視覚的写像に相当する。すなわち集合

$$
\lbrace x_{r,j} \mid j=1,\dots,9 \rbrace, \quad
\lbrace x_{i,c} \mid i=1,\dots,9 \rbrace
$$

さらに $3\times 3$ ブロック内の変数群がすべて相異なる値を取らなければならないという制約を、抽象的な論理式から色彩空間への埋め込みによって直観的に把握可能とするのである。これは単に操作性を補助するのみならず、制約充足問題における局所的一貫性を可視的に体現するものにほかならない。

さらに、特定の数値 $d$ に関して確定済みのセルを集合 $S_d = \{(r,c)\mid x_{r,c} = d\}$ と定義し、これらを同一の強調色で表示するならば、盤面における $d$ の分布は一目で捉えられる。加えて候補集合 $C_{r,c}$ に $d$ を含むセルを淡色で示すことにより、 $d$ の潜在的配置領域が視覚的に重ね合わされる。これにより「このブロックには $d$ がまだ配置されていない」「この行では候補が一つに絞られつつある」といった推論が、形式的には単純な集合演算で表されるものを、視覚的直観として即座に呼び起こすことができる。

矛盾検出においては、ユニット内部で同一数の候補が過剰に分布する場合、すなわち局所的な制約不一致の兆候が認められるときに、赤色や熱量分布の形式で視覚的警告を与えることが有効である。これは制約充足問題の枠組みにおける不可解集合の出現を、人間に理解しやすい形に翻訳したものであり、論理的一貫性の維持がどの箇所で危殆に瀕しているかを明瞭にする。こうした可視化は単なるデバッグ機能ではなく、解読アルゴリズムが論理的に進行しているか否かを外部に対して説明責任を果たすための学術的手段に等しい。

特に重要なのは段階的解読の過程を逐次的に可視化する仕組みである。たとえば唯一候補 (singleton) の縮約作用素が適用される場合、形式的には $\lvert C_{r,c}\rvert = 1 \implies x_{r,c}$ が確定するという単純な推論規則にすぎないが、GUI 上においては対象セルを点滅や枠線強調によって際立たせ、さらに根拠となった候補集合の構造を示すことで、論理的証跡を可視的に提示することができる。このようにしてユーザは、単に結果を与えられるのではなく、逐次的な数理的縮約を追体験することになる。結果として、アルゴリズムはブラックボックスではなくホワイトボックスとして機能し、その透明性は教育的価値へと転化する。

総じて言えば、数独解読における GUI と可視化の設計は、単なる操作性向上のための付加機能ではなく、制約充足の理論的構造を人間の認知様式に翻訳するための不可欠の学術的装置である。数理的な論理展開を可視化により表象することによって、アルゴリズムの信頼性は保証され、ユーザは推論の進行を逐一理解することができる。すなわち可視化とは、解読過程の数学的透明性を担保すると同時に、教育的応用の可能性を最大限に拡張するための方法論的基盤であると言わねばならない。



## 8. Core API の設計

数独解読における数理的推論エンジンとユーザインターフェースを接続するためには、両者の関心領域を厳密に分離しつつも、双方向的な情報伝達を可能にする抽象層として Core API を設計することが必須となる。この API の本質的役割は、解読アルゴリズムが生成する内部的推論構造を、GUI が視覚的証跡として忠実に再構成できる形式へと翻訳する点にある。したがって、盤面状態、候補集合、推論ステップ、探索分岐といった数学的対象を、厳格に定義された抽象データ型として外部に提示することが求められる。

内部表現としては、各セルの候補集合を $9$ ビットのマスクに写像し、さらに行・列・ボックス単位での使用済み数値を占有ビット列で管理する方式が最適である。しかしこれらは実装上の詳細にすぎず、外部 API では単一の `Board` 型として抽象化される。この抽象型は「セルが確定しているか」「候補がいくつ残っているか」といった問い合わせを一定の時間計算量で保証し、アルゴリズムの透明性を保ちながらも GUI 側からの不変条件の破壊を許さないよう設計されるべきである。

推論規則の適用結果は `Step` 構造体として返却され、その内部には適用された規則の識別名、根拠となったセル群（証人集合）、削除された候補集合、確定された値、そして GUI 表示のための自然言語的説明文が格納される。これにより解読コアは純粋に制約理論的な縮約や探索の実行に専念しつつ、GUI 側はユーザに対して「どのセルが唯一候補であったため確定されたのか」「どの候補が矛盾により排除されたのか」といった論理的痕跡を逐次的に可視化できる。すなわち API は論理推論と可視的表現との間に明確な境界を引きながら、その両者を緊密に接続する役割を果たす。

探索に関しては、関数 `solve(Board)` を再帰的に呼び出す標準的インターフェースが想定される。固定点計算によって候補削減が尽くされた後、なお未確定セルが残存する場合にのみ分岐が導入され、その過程で生成されるステップには特別に `branch` 識別子が付与される。この情報は GUI 側で明示的に提示され、論理的推論の必然性に基づく確定と、探索的仮置きによる枝分かれとを明確に区別する機能を持つ。こうして API 経由で全ての推論過程が逐一記録されることにより、難易度計算に資する定量的指標の収集や、教育的利用を目的とした学習データベースの構築が統一的な枠組みの下で可能となる。

要するに、Core API は数理的制約充足系と人間中心的可視化系の境界に位置する形式的プロトコルであり、その設計如何が解読アルゴリズムの信頼性、GUI の透明性、そしてアプリケーション全体の教育的価値を決定する。抽象型と証跡構造体を中核に据えたこの設計は、数独解読を単なる計算作業から認知的・教育的営為へと昇華させるための不可欠な方法論的基盤である。



## 9. 生成アルゴリズム（DLX）

数独問題の生成において決定的に重要となるのは、一意解性を確実に保証するための厳密な検証手続きである。完全盤から与え値を順次削除していく操作は表面的には単純であるが、その各段階で「解がただ一つしか存在しない」という条件を満たすか否かを判定する必要がある。この判定を効率的かつ形式的に遂行するためには、Donald Knuth によって提案された Dancing Links (DLX) アルゴリズムを exact cover 問題の枠組みに適用することが最も有効である。

形式化の過程としては、数独の全制約を $729 \times 324$ の二値疎行列に符号化する手順を踏む。すなわち、729 行は「セル $(r,c)$ に数字 $d$ を置く」という可能な割当を表し、324 列は四種類の制約すなわち「各セルには正確に一つの数字が入る」「各行には $1$ から $9$ が一度ずつ現れる」「各列には $1$ から $9$ が一度ずつ現れる」「各 $3\times 3$ ボックスには $1$ から $9$ が一度ずつ現れる」を反映する。あるセルに与え値が事前に指定されている場合、その候補以外の行はすべて削除され、残余の部分行列が生成される。したがって、問題の充足可能性はこの exact cover 行列の解として対応づけられる。

DLX は dancing links と呼ばれる双方向連結構造を利用して列削除と復元を高速に行い、exact cover の全解を網羅的に探索するアルゴリズムである。数独における一意性判定では、DLX を「二解検出器」として用いることが肝要である。すなわち、一つの解が発見された時点で探索を停止せず、探索を継続して二つ目の解が出現した瞬間に即座に停止し「多解あり」と判定する。逆に探索を最後まで行っても二解目が見つからなければ、その問題は一意解性を有することが保証される。この仕組みによって、一意性検証は不要な探索を極限まで抑制しつつ厳密性を保持する。

問題生成アルゴリズムはこの一意性判定を逐次的に適用しつつ進行する。すなわち、与え値集合から一つのセルを候補に選び、それを削除した盤面を構築する。その後 DLX によって一意性検査を実行し、依然として解が一つである場合のみ削除を確定する。もし二解目が検出されれば、その削除は棄却され、別のセルが選択される。この操作を繰り返すことで、完全盤から制約を緩めつつも常に一意解性が保持された状態が維持され、最終的に安定的に一意解数独問題を構築することが可能となる。

以上の枠組みは、問題生成における「解の存在」と「解の一意性」とを明確に区別しつつ、両者を exact cover 問題の数理的形式化によって統一的に扱うものである。DLX による一意性検証は、単に効率的であるにとどまらず、生成過程全体の論理的厳密性を支える基盤技術として位置づけられる。



## 10. 複雑性の分析と最適化

数独解読の計算複雑性を評価する場合、探索アルゴリズムの理論的計算量は本質的に指数時間であることを免れない。これは制約充足問題一般における NP 完全性の帰結であり、最悪の場合には $9^{81}$ に近い組合せ的爆発が潜在する。しかし実際の解読過程では、各セルの候補集合に対する縮約規則の反復適用が大部分の変数を初期段階で確定させるため、探索空間は指数的増大の可能性を持ちながらも実効的には劇的に縮小する。したがって平均的な実行時間は盤面の構造、初期与え値の配置、難易度に密接に依存し、単なる理論的上界では予測できない振る舞いを示す。

この複雑性を実用的水準に抑制するための第一要素はデータ構造の選択である。各セルの候補集合を $9$ ビットのマスクとして表現するならば、候補削減や確定判定の演算は単一のビット演算すなわち定数時間で遂行可能となる。さらに盤面全体にわたる候補更新処理も $81$ セルに対する走査で完結するため $O(81)$、すなわち定数時間に等しい計算で済む。この手法は高水準言語である Python 実装においても十分高速に動作し、C 言語や Cython による低レベル最適化を導入すれば一桁から二桁の性能向上が期待される。

探索の複雑性削減においてはヒューリスティクスの設計が決定的である。最小残余値 (MRV: Minimum Remaining Values) に基づく分岐点選択は探索木の平均深度を効果的に抑制し、分岐ごとの期待情報量を指標として採用すればさらに効率的な枝刈りが可能となる。加えて失敗駆動学習によるノーグッド集合の共有は SAT ソルバにおける conflict-driven clause learning (CDCL) の技術を応用するものであり、探索木における重複経路を劇的に排除する。この結果、理論的には指数的な探索であっても、実際の平均的複雑性は多項式的に近似可能な水準まで低減されることが多い。

以上のように数独解読における効率性は、形式的な計算量解析と経験的な平均挙動の差異を正しく理解した上で、適切なデータ構造とヒューリスティクスを選択することによって初めて最適化される。理論的複雑性の峻厳さを認めつつも、実装工学的工夫により実効的な高速解読を実現することこそが、数独ソルバ設計の核心である。



## 11. テスト規律

解読システムの正当性を数学的・工学的に保証するためには、厳格に定義されたテスト規律の下で検証を行うことが不可欠である。まず基礎となるのは各推論規則に対する **健全性テスト** である。これは規則適用後の盤面が常に数独の全制約を保持していること、すなわち候補集合の削除や値の確定に誤謬が存在しないことを保証する試験である。この過程においては推論の局所的な正しさを担保し、単一規則レベルでの論理的一貫性を確認する。

さらに規則群全体の振る舞いに関しては **可換性テスト** を課す必要がある。これは異なる適用順序に従った場合にも最終的に同一の固定点に収束することを検証する試験であり、推論エンジンが冪等性と安定性を有することを証明する。この検証を通じて、推論過程が順序依存的な副作用を含まないことを保証し、アルゴリズム全体の健全な振る舞いを確認する。

問題生成器に関しては **一意性テスト** が中心的課題となる。生成された全ての問題 $P$ に対し DLX を用いた二解検出を実施し、一意性述語 $U(P)$ が常に成立することを確認する。これにより多解を持つ不適切な問題が混入することを未然に防ぐことができる。加えて難易度評価に対しては **リグレッションテスト** を導入し、既知の参照問題集合に対して算出される難易度指標が事前に設定された期待範囲に収まることを検証する。この仕組みによって難易度計測アルゴリズムの安定性と一貫性が長期的に維持される。

最後にユーザインターフェースに対しては **整合性テスト** を実施する必要がある。バックエンドから返却される推論証跡情報が GUI 上で常に正確に表現され、ユーザが論理過程を追跡可能であることを確認する。この検証は数理的正当性とユーザ体験の結合を保証するものであり、アプリケーションの教育的価値と操作的信頼性の両立に直結する。

要するに、数独解読システムにおけるテスト規律は、局所的規則の健全性、規則群の可換性、生成問題の一意性、難易度指標の安定性、そして GUI 表現の整合性という多層的構造を持たねばならない。これらの体系的試験を通じてのみ、数理的に厳密でかつユーザに信頼される解読環境が構築されるのである。



## 12. まとめ

本稿全体を通じて、数独を有限領域制約充足問題として厳密に定式化し、その解読過程を数理的・工学的両面から体系的に論じた。推論規則は縮約作用素の不動点として理解され、健全性と停止性が保証されることを示した。また、推論のみでは盤面の完全決定に至らない場合に探索を導入し、最小残余値 (MRV) や Degree、情報量に基づくヒューリスティクスを組み合わせることで探索木の効率的剪定を実現する方法を明らかにした。さらに、失敗駆動学習によるノーグッド集合の共有を適用し、探索の重複を排除することで解読の加速が可能となることを示した。

難易度の定量化については、推論規則ごとの原価、探索コスト、情報量削減量を統合することで、一貫した尺度を構築する手法を提示した。問題生成に関しては、完全盤からの与え値削除を基盤とし、Donald Knuth の Dancing Links (DLX) アルゴリズムによる一意性判定を随伴させることで、一解性を厳密に保証した。さらに焼きなまし法など確率的探索法を組み合わせることで、目標難易度に収束させる生成アルゴリズムの構成を論じた。これらにより、生成される問題は厳密な一意性を保持しつつ、所望の難易度分布を実現することが可能となる。

加えて GUI による可視化の設計が、数理的推論の透明性を保証し、ユーザに推論過程を追体験させる教育的効果をもたらすことを論じた。行・列・ボックスの制約構造、数値分布、候補集合の縮約過程、矛盾検出の警告表示、そして段階解読における証跡の逐次的提示が、直観的理解を促進するインターフェースとして位置づけられる。

以上を総合すれば、SudokuResolver は、数理的基盤に支えられた解読コア、形式的に定義された難易度評価体系、DLX に基づく厳密な一意性保証を備えた問題生成器、そして透明性と教育的価値を重視した GUI を統合する総合的システムである。この設計は単なる娯楽的ツールを超えて、制約充足問題の実用的応用、数理的推論教育の教材、さらには人間型推論と計算機推論との交錯を観察する実験的プラットフォームとして学術的意義を持つものである。