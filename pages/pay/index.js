// pages/pay/index.js
import regeneratorRuntime from '../../lib/runtime/runtime';
import {
  request,
  http,
} from "../../request/index.js";
const WXAPI = require('apifm-wxapi');
const AUTH = require('../../utils/auth')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    address: {},
    curAddressData: {},
    cart: [],
    totalPrice: 0,
    totalNum: 0,
    isNeedLogistics: 0,
    // wxlogin: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    let cart = wx.getStorageSync('cart') || [];

    let single = wx.getStorageSync('single') || [];

    cart = cart.filter(v => v.checked);

    // this.setData({ address });
    this.setData({
      isNeedLogistics: 1,
    })

    let totalPrice = 0;
    let totalNum = 0;
    if (single.length > 0) {
      this.setData({
        cart: single,
        totalNum: 1,
        totalPrice: single[0].basicInfo.minPrice,
      })
    } else {
      cart.forEach(v => {
        cart,
        totalPrice += v.num * v.basicInfo.minPrice;
        totalNum += v.num;
      });
      this.setData({
        cart,
        totalPrice,
        totalNum,
      })
    }
    // this.initShippingAddress();
  },

  onShow() {
    this.initShippingAddress();
  },

  async handleOrderPay() {
    
    // 1 判断缓存中有没有token 
    const token = wx.getStorageSync("token");
    // 2 判断
    if (!token) {
      AUTH.login();
      return;
    }
    
    // 3 创建订单
      // 3.1 准备 请求头参数
      // const header = { Authorization: token };
      // 3.2 准备 请求体参数
    const order_price = this.data.totalPrice;
    const consignee_addr = this.data.curAddressData;
    const cart = this.data.cart;
    let goods = [];

    cart.forEach(v => goods.push({
      goodsId: v.basicInfo.id,
      number: v.num || 1,
      propertyChildIds: "",
      logisticsType: 0

    }))

    let postData = {
      token: token,
      goodsJsonStr: JSON.stringify(goods),
      address: consignee_addr.address,
      linkMan: consignee_addr.linkMan,
      mobile: consignee_addr.mobile,
      provinceId: consignee_addr.provinceId,
      cityId: consignee_addr.cityId,
      code: consignee_addr.code,

    };
    
    //创建订单
    const res=await WXAPI.orderCreate(postData);//创建订单、下单
      if (res.code != 0) {
        wx.showModal({
          title: '错误',
          content: res.msg,
          showCancel: false
        })
        return;
      };
      //console.log(res.data);
       let order_number={
        token: token,
        nextAction:{type:0, id:res.data.id},
       money:res.data.amountReal,
       payName:"城屿商城支付",
      };
      //console.log(order_number);
      
      WXAPI.wxpay(order_number).then(function (res) {
        console.log(order_number, '<-order_number->');
        if (res.code == 0) {
          // 发起支付
          console.log(res, '<-res321000->');
          wx.requestPayment({
            timeStamp: res.data.timeStamp,
            nonceStr: res.data.nonceStr,
            package: 'prepay_id=' + res.data.prepayId,
            signType: res.data.signType,
            paySign: res.data.sign,
            fail: function (aaa) {
              wx.showToast({
                title: '支付失败:' + aaa
                
              })
              
            },
            success: function () {
              // 提示支付成功
              wx.showToast({
                title: '支付成功',
              })
              console.log(order_number.nextAction.id)

              wx.redirectTo({
                url: redirectUrl
              });
            }
          })
        } else {
          wx.showModal({
            title: '出错了',
            content: JSON.stringify(res),
            showCancel: false
          })
        }
      })
    wx.removeStorageSync('single');//清空缓存
    this.clearPayProduct();
    
    //console.log({order_number});
    //页面跳转
    wx.navigateTo({
      url: '/pages/order/index'
    });
    
  },


  //手动删除缓存中 已经支付了的商品
  clearPayProduct() {

    let cartTotal = wx.getStorageSync('cart') || [];

    let newCart = cartTotal.filter(val => val.checked === false)

    wx.setStorageSync('cart', newCart);
  },
  //

  async initShippingAddress() {
    const res = await WXAPI.defaultAddress(wx.getStorageSync("token"))
    if (res.code == 0) {
      this.setData({
        curAddressData: res.data.info
      });
    } else {
      this.setData({
        curAddressData: null
      });
    }
  },

  addAddress: function () {
    wx.navigateTo({
      url: "/pages/address-add/index"
    })
  },
  selectAddress: function () {
    wx.navigateTo({
      url: "/pages/select-address/index"
    })
  },
  onUnload() {
    wx.removeStorageSync('single');
  }
})