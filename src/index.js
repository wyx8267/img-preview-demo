let scale = 1
let offset = { left: 0, top: 0 }
let origin = 'center'
let startPoint = { x: 0, y: 0 }
let isTouching = false
let isMove = false
let touches = new Map()
let lastDistance = 0
let lastScale = 1
let scaleOrigin = { x: 0, y: 0 }

const { innerWidth: winWidth, innerHeight: winHeight } = window
let cloneEl = null
let originalEl = null
document.getElementById('list').addEventListener('click', function (e) {
  e.preventDefault()
  if (e.target.classList.contains('item')) {
    originalEl = e.target
    cloneEl = originalEl.cloneNode(true)
    originalEl.style.opacity = 0
    openPreview()
  }
})

function openPreview() {
  scale = 1
  const { offsetWidth, offsetHeight } = originalEl
  const { top, left } = originalEl.getBoundingClientRect()
  //创建蒙层，添加到body
  const mask = document.createElement('div')
  mask.classList.add('modal')
  document.body.appendChild(mask)
  // 蒙层点击事件，关闭弹窗
  const clickFunc = function () {
    setTimeout(() => {
      if (isMove) {
        isMove = false
      } else {
        changeStyle(cloneEl, [`transition: all .3s`, `left: ${left}px`, `top: ${top}px`, `transform: translate(0, 0)`, `width: ${offsetWidth}px`])
        setTimeout(() => {
          document.body.removeChild(this)
          originalEl.style.opacity = 1
          mask.removeEventListener('click', clickFunc)
        }, 300);
      }
    }, 280);
  }
  mask.addEventListener('click', clickFunc)
  mask.addEventListener('mousewheel', zoom, { passive: false })
  changeStyle(cloneEl, [`left: ${left}px`, `top: ${top}px`])
  mask.appendChild(cloneEl)

  // 移动图片到屏幕中心
  const originalCenterPoint = { x: offsetWidth / 2 + left, y: offsetHeight / 2 + top }
  const winCenterPoint = { x: winWidth / 2, y: winHeight / 2 }
  const offsetDistance = { left: winCenterPoint.x - originalCenterPoint.x + left, top: winCenterPoint.y - originalCenterPoint.y + top }
  const diffs = { left: ((adaptScale() - 1) * offsetWidth) / 2, top: ((adaptScale() - 1) * offsetHeight) / 2 }
  changeStyle(cloneEl, ['transition: all .3s', `width: ${offsetWidth * adaptScale() + 'px'}`, `transform: translate(${offsetDistance.left - left - diffs.left}px, ${offsetDistance.top - top - diffs.top}px)`])

  // 消除偏差
  setTimeout(() => {
    changeStyle(cloneEl, ['transition: all .3s', 'left: 0', 'top: 0', `transform: translate(${offsetDistance.left - diffs.left}px, ${offsetDistance.top - diffs.top}px)`])
    offset = { left: offsetDistance.left - diffs.left, top: offsetDistance.top - diffs.top }
  }, 300);
}

// 滚轮缩放
const zoom = (event) => {
  if (!event.deltaY) {
    return
  }
  event.preventDefault()
  origin = `${event.offsetX}px ${event.offsetY}px`
  if (event.deltaY < 0) {
    scale += 0.1
  } else if (event.deltaY > 0) {
    scale >= 0.2 && (scale -= 0.1)
  }
  offset = getOffsetCorrection(event.offsetX, event.offsetY)
  changeStyle(cloneEl, ['transition: all .15s', `transform-origin: ${origin}`, `transform: translate(${offset.left + 'px'}, ${offset.top + 'px'}) scale(${scale})`])
}

// 获取中心改变的偏差
function getOffsetCorrection(x = 0, y = 0) {
  const touchArr = Array.from(touches)
  if (touchArr.length === 2) {
    const start = touchArr[0][1]
    const end = touchArr[1][1]
    x = (start.offsetX + end.offsetX) / 2
    y = (start.offsetY + end.offsetY) / 2
  }
  origin = `${x}px ${y}px`
  const offsetLeft = (scale - 1) * (x - scaleOrigin.x) + offset.left
  const offsetTop = (scale - 1) * (y - scaleOrigin.y) + offset.top
  scaleOrigin = { x, y }
  return { left: offsetLeft, top: offsetTop }
}

// 修改样式的工具类，可减少回流重绘
function changeStyle(el, arr) {
  const original = el.style.cssText.split(';')
  original.pop()
  el.style.cssText = original.concat(arr).join(';') + ';'
}

// 获取距离
function getDistance() {
  const touchArr = Array.from(touches)
  if (touchArr.length < 2) {
    return 0
  }
  const start = touchArr[0][1]
  const end = touchArr[1][1]
  return Math.hypot(end.x - start.x, end.y - start.y)
}

// 计算自适应屏幕的缩放值
function adaptScale() {
  const { offsetWidth: w, offsetHeight: h} = originalEl
  let scale = 0
  scale = winWidth / w
  if (h * scale > winHeight - 80) {
    scale = (winHeight - 80) / h
  }
  return scale
}

window.addEventListener('pointerdown', function (e) {
  e.preventDefault()
  touches.set(e.pointerId, e)
  isTouching = true
  startPoint = { x: e.clientX, y: e.clientY }
  if (touches.size === 2) {
    lastDistance = getDistance()
    lastScale = scale
  }
})
window.addEventListener('pointerup', function (e) {
  touches.delete(e.pointerId)
  if (touches.size <= 0) {
    isTouching = false
  } else {
    const touchArr = Array.from(touches)
    startPoint = { x: touchArr[0][1].clientX, y: touchArr[0][1].clientY }
  }
  setTimeout(() => {
    isMove = false
  }, 300);
})
window.addEventListener('pointermove', function (e) {
  e.preventDefault()
  if (isTouching) {
    isMove = true
    if (touches.size < 2) { // 单指滑动
      offset = {
        left: offset.left + (e.clientX - startPoint.x),
        top: offset.top + (e.clientY - startPoint.y)
      }
      changeStyle(cloneEl, ['transition: all 0s', `transform: translate(${offset.left + 'px'}, ${offset.top + 'px'}) scale(${scale})`, `transform-origin: ${origin}`])
      startPoint = { x: e.clientX, y: e.clientY }
    } else { // 双指缩放
      touches.set(e.pointerId, e)
      const radio = getDistance() / lastDistance
      scale = radio * lastScale
      offset = getOffsetCorrection()
      changeStyle(cloneEl, ['transition: all 0s', `transform: translate(${offset.left + 'px'}, ${offset.top + 'px'}) scale(${scale})`, `transform-origin: ${origin}`])
    }
  }
})
window.addEventListener('pointercancel', function (e) {
  touches.clear()
})
