import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Input, List, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { adminApi, type Department, type Project, type User } from "@/api";
import { useAuth } from "@/stores/auth";

export default function Admin() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const statsQ = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
  const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const projsQ = useQuery({ queryKey: ["admin", "projects"], queryFn: adminApi.projects });
  const deptsQ = useQuery({ queryKey: ["admin", "departments"], queryFn: adminApi.departments });
  const [newDept, setNewDept] = useState("");

  const deptOptions = (deptsQ.data ?? []).map((d) => ({ value: d.id, label: d.name }));
  const createDept = async () => {
    if (!newDept.trim()) return;
    await adminApi.createDept(newDept.trim()); setNewDept("");
    qc.invalidateQueries({ queryKey: ["admin", "departments"] });
  };
  const delDept = async (id: string) => {
    await adminApi.deleteDept(id);
    qc.invalidateQueries({ queryKey: ["admin", "departments"] });
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };
  const setUserDept = async (uid: string, did: string | null) => {
    await adminApi.setUserDept(uid, did);
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const setRole = async (uid: string, role: string) => {
    await adminApi.setRole(uid, role);
    message.success("角色已更新");
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };
  const del = async (uid: string) => {
    try {
      await adminApi.deleteUser(uid);
      message.success("已删除");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e: any) { message.error(typeof e === "string" ? e : "删除失败"); }
  };

  const userCols = [
    { title: "姓名", dataIndex: "name" },
    { title: "邮箱", dataIndex: "email" },
    {
      title: "系统角色", dataIndex: "role",
      render: (role: string, u: User) => (
        <Select
          size="small" value={role || "member"} style={{ width: 110 }}
          disabled={u.id === me?.id}
          onChange={(v) => setRole(u.id, v)}
          options={[{ value: "admin", label: "管理员" }, { value: "member", label: "成员" }]}
        />
      ),
    },
    {
      title: "部门", dataIndex: "departmentId",
      render: (did: string, u: User) => (
        <Select size="small" style={{ width: 120 }} allowClear placeholder="未分配"
          value={did || undefined} options={deptOptions}
          onChange={(v) => setUserDept(u.id, v ?? null)} />
      ),
    },
    {
      title: "操作", key: "act",
      render: (_: any, u: User) =>
        u.id === me?.id ? <Tag>当前账号</Tag> : (
          <Popconfirm title="确认删除该用户？" onConfirm={() => del(u.id)}>
            <a style={{ color: "var(--hive-danger)" }}>删除</a>
          </Popconfirm>
        ),
    },
  ];

  const projCols = [
    { title: "项目名称", dataIndex: "name" },
    { title: "描述", dataIndex: "description", render: (d: string) => d || "—" },
    { title: "ID", dataIndex: "id", render: (id: string) => <span style={{ color: "var(--hive-muted)", fontSize: 12 }}>{id.slice(0, 8)}</span> },
  ];

  return (
    <div style={{ padding: 28 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>管理后台</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="用户数" value={statsQ.data?.users ?? 0} /></Card></Col>
        <Col span={8}><Card><Statistic title="项目数" value={statsQ.data?.projects ?? 0} /></Card></Col>
        <Col span={8}><Card><Statistic title="任务数" value={statsQ.data?.tasks ?? 0} /></Card></Col>
      </Row>
      <Tabs
        items={[
          {
            key: "users", label: "用户管理",
            children: <Table rowKey="id" loading={usersQ.isLoading} dataSource={usersQ.data} columns={userCols} pagination={false} />,
          },
          {
            key: "projects", label: "项目总览",
            children: <Table rowKey="id" loading={projsQ.isLoading} dataSource={projsQ.data as Project[]} columns={projCols} pagination={false} />,
          },
          {
            key: "depts", label: "组织架构",
            children: (
              <div style={{ maxWidth: 480 }}>
                <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                  <Input placeholder="新部门名称" value={newDept} onChange={(e) => setNewDept(e.target.value)} onPressEnter={createDept} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={createDept}>新建部门</Button>
                </Space.Compact>
                <List
                  bordered loading={deptsQ.isLoading}
                  dataSource={(deptsQ.data ?? []) as Department[]}
                  locale={{ emptyText: "暂无部门" }}
                  renderItem={(d) => (
                    <List.Item actions={[<Popconfirm key="d" title="删除该部门？" onConfirm={() => delDept(d.id)}><a style={{ color: "var(--hive-danger)" }}>删除</a></Popconfirm>]}>
                      {d.name}
                    </List.Item>
                  )}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
