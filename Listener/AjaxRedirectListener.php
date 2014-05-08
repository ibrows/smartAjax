<?php

namespace Ibrows\SmartAjaxBundle\Listener;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\FilterResponseEvent;
use Symfony\Component\HttpKernel\Kernel;

class AjaxRedirectListener
{
    /**
     * @var int
     */
    protected $redirectCode = 205;

    /**
     * @var boolean
     */
    protected $enabled = true;

    /**
     * @var string
     */
    protected $redirectHeader = 'Redirect-Location';

    /**
     * @param int $redirectCode
     * @param string $redirectHeader
     */
    public function __construct($redirectCode = 205, $redirectHeader = 'Redirect-Location')
    {
        $this->redirectCode = $redirectCode;
        $this->redirectHeader = $redirectHeader;
    }

    /**
     * @param FilterResponseEvent $event
     */
    public function onKernelResponse(FilterResponseEvent $event)
    {
        if(!$this->enabled){
            return;
        }

        if(
            $event->getRequestType() == Kernel::MASTER_REQUEST &&
            $event->getRequest()->isXmlHttpRequest() &&
            ($response = $event->getResponse()) instanceof RedirectResponse
        ){
            /** @var RedirectResponse $response */
            if($event->getRequest()->headers->get('Ibrows-Smart-Ajax-Request')){
                $event->setResponse(new Response('', $this->redirectCode, array(
                    $this->redirectHeader => $response->getTargetUrl()
                )));
            }
        }
    }

    /**
     * @param boolean $enabled
     */
    public function setEnabled($enabled)
    {
        $this->enabled = $enabled;
    }

    /**
     * @return boolean
     */
    public function getEnabled()
    {
        return $this->enabled;
    }

    /**
     * @return string
     */
    public function getRedirectHeader()
    {
        return $this->redirectHeader;
    }

    /**
     * @return int
     */
    public function getRedirectCode()
    {
        return $this->redirectCode;
    }
}