---
title: 洛谷 P3833 [AHOI2012] 树上的操作
date: "2026-08-14T23:24:19+08:00"
author: 胡梨
tags: [算法, 树链剖分, 线段树]
---

给群里红石镐的题解备份，免得翻记录翻两百条。

## 题意

一棵树，支持两种操作：

- 路径加：把 $u$ 到 $v$ 路径上每个点权值加 $w$
- 区间和：求 $u$ 到 $v$ 路径上的点权和

## 思路

板子题，树链剖分 + 线段树。两遍 DFS 剖出重链，把树上问题变成区间问题，再用线段树维护 dfn 序。

## 代码

```cpp
#include <bits/stdc++.h>
using namespace std;

typedef long long ll;

const int N = 100005;

int n, m;
int head[N], to[N << 1], nxt[N << 1], etot;
int fa[N], dep[N], siz[N], son[N], top[N], dfn[N], tot;
ll sum[N << 2], lazy[N << 2];

void add(int u, int v) {
    to[++etot] = v;
    nxt[etot] = head[u];
    head[u] = etot;
}

// 第一遍 DFS：求 fa, dep, siz, son
void dfs1(int u, int f) {
    fa[u] = f;
    dep[u] = dep[f] + 1;
    siz[u] = 1;
    for (int e = head[u]; e; e = nxt[e]) {
        int v = to[e];
        if (v == f) continue;
        dfs1(v, u);
        siz[u] += siz[v];
        if (siz[v] > siz[son[u]]) son[u] = v;
    }
}

// 第二遍 DFS：剖重链，求 top, dfn
void dfs2(int u, int t) {
    top[u] = t;
    dfn[u] = ++tot;
    if (!son[u]) return;
    dfs2(son[u], t);
    for (int e = head[u]; e; e = nxt[e]) {
        int v = to[e];
        if (v == fa[u] || v == son[u]) continue;
        dfs2(v, v);
    }
}

void pushup(int p) {
    sum[p] = sum[p << 1] + sum[p << 1 | 1];
}

void pushdown(int p, int l, int r) {
    if (lazy[p]) {
        int mid = (l + r) >> 1;
        lazy[p << 1] += lazy[p];
        lazy[p << 1 | 1] += lazy[p];
        sum[p << 1] += lazy[p] * (mid - l + 1);
        sum[p << 1 | 1] += lazy[p] * (r - mid);
        lazy[p] = 0;
    }
}

void build(int p, int l, int r) {
    if (l == r) {
        sum[p] = 0;
        return;
    }
    int mid = (l + r) >> 1;
    build(p << 1, l, mid);
    build(p << 1 | 1, mid + 1, r);
    pushup(p);
}

void update(int p, int l, int r, int ql, int qr, ll w) {
    if (ql <= l && r <= qr) {
        sum[p] += w * (r - l + 1);
        lazy[p] += w;
        return;
    }
    pushdown(p, l, r);
    int mid = (l + r) >> 1;
    if (ql <= mid) update(p << 1, l, mid, ql, qr, w);
    if (qr > mid) update(p << 1 | 1, mid + 1, r, ql, qr, w);
    pushup(p);
}

ll query(int p, int l, int r, int ql, int qr) {
    if (ql <= l && r <= qr) return sum[p];
    pushdown(p, l, r);
    int mid = (l + r) >> 1;
    ll res = 0;
    if (ql <= mid) res += query(p << 1, l, mid, ql, qr);
    if (qr > mid) res += query(p << 1 | 1, mid + 1, r, ql, qr);
    return res;
}

void upd_path(int u, int v, ll w) {
    while (top[u] != top[v]) {
        if (dep[top[u]] < dep[top[v]]) swap(u, v);
        update(1, 1, n, dfn[top[u]], dfn[u], w);
        u = fa[top[u]];
    }
    if (dep[u] > dep[v]) swap(u, v);
    update(1, 1, n, dfn[u], dfn[v], w);
}

ll qry_path(int u, int v) {
    ll res = 0;
    while (top[u] != top[v]) {
        if (dep[top[u]] < dep[top[v]]) swap(u, v);
        res += query(1, 1, n, dfn[top[u]], dfn[u]);
        u = fa[top[u]];
    }
    if (dep[u] > dep[v]) swap(u, v);
    res += query(1, 1, n, dfn[u], dfn[v]);
    return res;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> n >> m;
    for (int i = 1; i < n; i++) {
        int x, y;
        cin >> x >> y;
        add(x, y);
        add(y, x);
    }
    dfs1(1, 0);
    dfs2(1, 1);
    build(1, 1, n);
    while (m--) {
        string op;
        cin >> op;
        if (op == "Add") {
            int u, v;
            ll w;
            cin >> u >> v >> w;
            upd_path(u, v, w);
        } else if (op == "Query") {
            int u, v;
            cin >> u >> v;
            cout << qry_path(u, v) << '\n';
        }
    }
    return 0;
}
```
