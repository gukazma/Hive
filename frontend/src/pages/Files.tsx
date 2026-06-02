import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Col, Empty, Row, Spin, Upload, Typography, message } from "antd";
import { InboxOutlined, FileOutlined } from "@ant-design/icons";
import { fileApi, type FileItem } from "@/api";

function human(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function Files() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["files"], queryFn: fileApi.list });

  const customUpload = async ({ file, onSuccess, onError }: any) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await fileApi.upload(fd);
      onSuccess?.({});
      message.success("上传成功");
      qc.invalidateQueries({ queryKey: ["files"] });
    } catch (e) {
      onError?.(e);
      message.error("上传失败");
    }
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>文件</Typography.Title>
      </div>

      <Upload.Dragger customRequest={customUpload} showUploadList={false} multiple style={{ marginBottom: 24 }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
      </Upload.Dragger>

      {listQ.isLoading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 40 }}><Spin /></div>
      ) : (listQ.data?.length ?? 0) === 0 ? (
        <Empty description="还没有文件" />
      ) : (
        <Row gutter={[16, 16]}>
          {(listQ.data as FileItem[]).map((f) => (
            <Col key={f.id} xs={12} sm={8} md={6} lg={4}>
              <Card hoverable>
                <div style={{ textAlign: "center", fontSize: 36, color: "var(--hive-primary)" }}><FileOutlined /></div>
                <div style={{ marginTop: 10, fontWeight: 500, color: "var(--hive-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "var(--hive-muted)" }}>{human(f.size)}</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
