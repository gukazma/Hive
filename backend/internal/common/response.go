package common

import "github.com/gin-gonic/gin"

// OK 返回成功数据。
func OK(c *gin.Context, data any) {
	c.JSON(200, gin.H{"code": 0, "data": data})
}

// Created 返回 201 成功数据。
func Created(c *gin.Context, data any) {
	c.JSON(201, gin.H{"code": 0, "data": data})
}

// Fail 返回错误。
func Fail(c *gin.Context, status int, msg string) {
	c.JSON(status, gin.H{"code": status, "message": msg})
}
